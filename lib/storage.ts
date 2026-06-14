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
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

/**
 * Storage interface that can be implemented by different storage backends
 */
export interface StorageAdapter {
  save(file: Buffer, fileName: string, permitId: string): Promise<string>
  get(filePath: string): Promise<Buffer>
  delete(filePath: string): Promise<void>
  exists(filePath: string): Promise<boolean>
}

/**
 * Reject files over the size limit (shared by all adapters).
 */
function assertWithinSizeLimit(file: Buffer): void {
  if (file.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/**
 * Generate a collision-resistant file name from the original (shared by all adapters).
 */
function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName)
  const baseName = path.basename(originalName, ext)
  const timestamp = Date.now()
  const random = randomBytes(4).toString('hex')
  return `${baseName}_${timestamp}_${random}${ext}`
}

/**
 * Build the driver-agnostic storage key for a permit document.
 * Always forward-slashed so it doubles as a GCS object key.
 */
function permitObjectKey(permitId: string, uniqueFileName: string): string {
  return `permits/${permitId}/${uniqueFileName}`
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
    assertWithinSizeLimit(file)

    // Create permit-specific directory
    const permitDir = path.join(this.rootPath, 'permits', permitId)
    await this.ensureDirectory(permitDir)

    // Generate unique file name
    const uniqueFileName = generateUniqueFileName(fileName)
    const filePath = path.join(permitDir, uniqueFileName)

    // Write file
    await fs.writeFile(filePath, file)

    // Return relative key for database storage
    return permitObjectKey(permitId, uniqueFileName)
  }

  /**
   * Retrieve a file from local storage
   * @param filePath - Relative path from storage root
   * @returns File buffer
   */
  async get(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.rootPath, filePath)
    
    // Security: Ensure path is within storage root
    const resolvedPath = path.resolve(fullPath)
    const resolvedRoot = path.resolve(this.rootPath)
    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error('Invalid file path: outside storage root')
    }

    return await fs.readFile(fullPath)
  }

  /**
   * Delete a file from local storage
   * @param filePath - Relative path from storage root
   */
  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.rootPath, filePath)
    
    // Security: Ensure path is within storage root
    const resolvedPath = path.resolve(fullPath)
    const resolvedRoot = path.resolve(this.rootPath)
    if (!resolvedPath.startsWith(resolvedRoot)) {
      throw new Error('Invalid file path: outside storage root')
    }

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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Storage } = require('@google-cloud/storage') as { Storage: GcsStorageCtor }
    this.bucket = new Storage().bucket(bucketName)
  }

  async save(file: Buffer, fileName: string, permitId: string): Promise<string> {
    assertWithinSizeLimit(file)
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
  // Local filesystem: ensure the storage root exists on module load.
  fs.mkdir(STORAGE_ROOT, { recursive: true }).catch(console.error)
  return new LocalStorageAdapter(STORAGE_ROOT)
}

export const storage = createStorageAdapter()

/**
 * Utility function to get MIME type from file extension
 */
export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  const mimeTypes: Record<string, string> = {
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
  return mimeTypes[ext] || 'application/octet-stream'
}

/**
 * Utility function to check if a file type can be previewed in browser
 */
export function isPreviewable(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase()
  const previewableTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.gif']
  return previewableTypes.includes(ext)
}

