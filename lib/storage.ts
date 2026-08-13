/**
 * File Storage Abstraction Layer
 *
 * Provides a single `storage` adapter behind a stable interface so callers
 * don't care where files physically live. The backend is selected at module
 * load via the STORAGE_DRIVER env var:
 *
 *   STORAGE_DRIVER=local  (default) — local filesystem under STORAGE_ROOT.
 *                                     Used for dev and the legacy Pi/Docker host.
 *   STORAGE_DRIVER=gcs               — Cloud Storage for Firebase. Required on
 *                                     Firebase App Hosting / Cloud Run, whose
 *                                     filesystem is ephemeral. Needs GCS_BUCKET
 *                                     and Application Default Credentials (the
 *                                     App Hosting service account provides these).
 *
 * The `storagePath` returned by save() is a driver-agnostic relative key
 * (`permits/{permitId}/{file}`) — the same string works as a local relative
 * path and as a GCS object key, so DB values don't change between drivers.
 */

import fs from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'

// Storage configuration
const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage')
const STORAGE_DRIVER = (process.env.STORAGE_DRIVER || 'local').toLowerCase()
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
export const MAX_UPLOAD_REQUEST_SIZE = MAX_FILE_SIZE + 1024 * 1024 // allow multipart overhead

const ALLOWED_FILE_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain',
}

const BINARY_SIGNATURES: Record<string, (file: Buffer) => boolean> = {
  '.pdf': (file) => file.subarray(0, 5).equals(Buffer.from('%PDF-')),
  '.jpg': (file) => file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff,
  '.jpeg': (file) => file.length >= 3 && file[0] === 0xff && file[1] === 0xd8 && file[2] === 0xff,
  '.png': (file) => file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  '.gif': (file) => {
    const header = file.subarray(0, 6).toString('ascii')
    return header === 'GIF87a' || header === 'GIF89a'
  },
  '.doc': (file) => isCompoundFileBinary(file),
  '.xls': (file) => isCompoundFileBinary(file),
  '.docx': (file) => isZipFile(file),
  '.xlsx': (file) => isZipFile(file),
  '.txt': (file) => isPlainText(file),
}

/**
 * Storage interface that can be implemented by different storage backends
 */
export interface StorageAdapter {
  save(file: Buffer, fileName: string, permitId: string): Promise<string>
  get(filePath: string): Promise<Buffer>
  delete(filePath: string): Promise<void>
  exists(filePath: string): Promise<boolean>
}

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
  }
}

/**
 * Reject files over the size limit (shared by all adapters).
 */
function assertWithinSizeLimit(file: Buffer): void {
  if (file.length > MAX_FILE_SIZE) {
    throw new FileValidationError(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

export function assertWithinUploadRequestLimit(contentLength: string | null): void {
  if (!contentLength) return
  const size = Number(contentLength)
  if (!Number.isFinite(size)) return
  if (size > MAX_UPLOAD_REQUEST_SIZE) {
    throw new FileValidationError(`Upload request exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

export function sanitizeFileName(originalName: string): string {
  const basename = path.basename(originalName).replace(/[\0\r\n]/g, '').trim()
  const originalExt = path.extname(basename)
  const ext = originalExt.toLowerCase()
  const stem = path.basename(basename, originalExt)
  const safeStem = stem
    .replace(/[^\w .()-]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)

  if (!safeStem || !ext) {
    throw new FileValidationError('File name must include a valid base name and extension')
  }

  return `${safeStem}${ext}`
}

export function validateUploadFile(
  file: Buffer,
  originalName: string,
  declaredMimeType?: string | null
): { fileName: string; mimeType: string } {
  assertWithinSizeLimit(file)

  if (file.length === 0) {
    throw new FileValidationError('Uploaded file is empty')
  }

  const fileName = sanitizeFileName(originalName)
  const ext = path.extname(fileName).toLowerCase()
  const expectedMimeType = ALLOWED_FILE_TYPES[ext]

  if (!expectedMimeType) {
    throw new FileValidationError('File type is not allowed')
  }

  const normalizedDeclaredType = declaredMimeType?.split(';')[0]?.trim().toLowerCase()
  if (
    normalizedDeclaredType &&
    normalizedDeclaredType !== 'application/octet-stream' &&
    normalizedDeclaredType !== expectedMimeType
  ) {
    throw new FileValidationError('Declared file type does not match the file extension')
  }

  const hasExpectedSignature = BINARY_SIGNATURES[ext]
  if (!hasExpectedSignature?.(file)) {
    throw new FileValidationError('File content does not match the allowed file type')
  }

  return { fileName, mimeType: expectedMimeType }
}

function isCompoundFileBinary(file: Buffer): boolean {
  return file.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))
}

function isZipFile(file: Buffer): boolean {
  return (
    file.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) ||
    file.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x05, 0x06])) ||
    file.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x07, 0x08]))
  )
}

function isPlainText(file: Buffer): boolean {
  if (file.includes(0)) return false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(file)
    return true
  } catch {
    return false
  }
}

function sanitizePathSegment(segment: string): string {
  const safeSegment = segment.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 128)
  if (!safeSegment) throw new FileValidationError('Invalid storage path segment')
  return safeSegment
}

function assertPathInsideRoot(rootPath: string, targetPath: string): void {
  const resolvedRoot = path.resolve(rootPath)
  const resolvedPath = path.resolve(targetPath)
  const relativePath = path.relative(resolvedRoot, resolvedPath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Invalid file path: outside storage root')
  }
}

/**
 * Generate a collision-resistant file name from the original (shared by all adapters).
 */
function generateUniqueFileName(originalName: string): string {
  const safeName = sanitizeFileName(originalName)
  const ext = path.extname(safeName)
  const baseName = path.basename(safeName, ext)
  const timestamp = Date.now()
  const random = randomBytes(4).toString('hex')
  return `${baseName}_${timestamp}_${random}${ext}`
}

/**
 * Build the driver-agnostic storage key for a permit document.
 * Always forward-slashed so it doubles as a GCS object key.
 */
function permitObjectKey(permitId: string, uniqueFileName: string): string {
  const safePermitPath = permitId.split('/').map(sanitizePathSegment).join('/')
  return `permits/${safePermitPath}/${uniqueFileName}`
}

/**
 * Local File System Storage Adapter
 * 
 * Stores files in a directory structure: storage/permits/{permitId}/{fileName}
 */
class LocalStorageAdapter implements StorageAdapter {
  private rootPath: string

  constructor(rootPath: string) {
    this.rootPath = rootPath
  }

  /**
   * Ensure the storage directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath)
    } catch {
      await fs.mkdir(dirPath, { recursive: true })
    }
  }

  /**
   * Save a file to local storage
   * @param file - File buffer to save
   * @param fileName - Original file name
   * @param permitId - Permit package ID for organization
   * @returns Storage path relative to root
   */
  async save(file: Buffer, fileName: string, permitId: string): Promise<string> {
    validateUploadFile(file, fileName)
    const uniqueFileName = generateUniqueFileName(fileName)
    const key = permitObjectKey(permitId, uniqueFileName)
    const filePath = path.join(this.rootPath, key)
    assertPathInsideRoot(this.rootPath, filePath)

    await this.ensureDirectory(path.dirname(filePath))
    await fs.writeFile(filePath, file)

    return key
  }

  /**
   * Retrieve a file from local storage
   * @param filePath - Relative path from storage root
   * @returns File buffer
   */
  async get(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.rootPath, filePath)
    assertPathInsideRoot(this.rootPath, fullPath)

    return await fs.readFile(fullPath)
  }

  /**
   * Delete a file from local storage
   * @param filePath - Relative path from storage root
   */
  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.rootPath, filePath)
    assertPathInsideRoot(this.rootPath, fullPath)

    try {
      await fs.unlink(fullPath)
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  /**
   * Check if a file exists
   * @param filePath - Relative path from storage root
   */
  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.rootPath, filePath)
    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }
}

// Minimal structural types for the bits of @google-cloud/storage we use.
// Declared locally so this module type-checks without the package's own
// declarations installed (node_modules is partly root-owned on the dev host;
// the dependency is resolved at deploy time via package.json).
interface GcsFile {
  save(data: Buffer, options?: { contentType?: string; resumable?: boolean }): Promise<unknown>
  download(): Promise<[Buffer]>
  delete(options?: { ignoreNotFound?: boolean }): Promise<unknown>
  exists(): Promise<[boolean]>
}
interface GcsBucket {
  file(key: string): GcsFile
}
interface GcsStorageCtor {
  new (): { bucket(name: string): GcsBucket }
}

/**
 * Cloud Storage for Firebase Adapter
 *
 * Stores objects at key `permits/{permitId}/{fileName}` in the configured
 * bucket. Uses Application Default Credentials — on Firebase App Hosting /
 * Cloud Run the runtime service account supplies these automatically.
 */
class GcsStorageAdapter implements StorageAdapter {
  private bucket: GcsBucket

  constructor(bucketName: string) {
    // Loaded lazily at runtime so local/dev (STORAGE_DRIVER=local) never
    // requires the package to be installed or present at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Storage } = require('@google-cloud/storage') as { Storage: GcsStorageCtor }
    this.bucket = new Storage().bucket(bucketName)
  }

  async save(file: Buffer, fileName: string, permitId: string): Promise<string> {
    validateUploadFile(file, fileName)
    const key = permitObjectKey(permitId, generateUniqueFileName(fileName))
    await this.bucket.file(key).save(file, {
      contentType: getMimeType(fileName),
      resumable: false,
    })
    return key
  }

  async get(filePath: string): Promise<Buffer> {
    const [buffer] = await this.bucket.file(filePath).download()
    return buffer
  }

  async delete(filePath: string): Promise<void> {
    await this.bucket.file(filePath).delete({ ignoreNotFound: true })
  }

  async exists(filePath: string): Promise<boolean> {
    const [exists] = await this.bucket.file(filePath).exists()
    return exists
  }
}

// Select the backend from STORAGE_DRIVER (default: local).
function createStorageAdapter(): StorageAdapter {
  if (STORAGE_DRIVER === 'gcs') {
    const bucketName = process.env.GCS_BUCKET
    if (!bucketName) {
      throw new Error('STORAGE_DRIVER=gcs requires the GCS_BUCKET env var')
    }
    return new GcsStorageAdapter(bucketName)
  }
  return new LocalStorageAdapter(STORAGE_ROOT)
}

export const storage = createStorageAdapter()

/**
 * Utility function to get MIME type from file extension
 */
export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  return ALLOWED_FILE_TYPES[ext] || 'application/octet-stream'
}

/**
 * Utility function to check if a file type can be previewed in browser
 */
export function isPreviewable(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase()
  const previewableTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif']
  return previewableTypes.includes(ext)
}
