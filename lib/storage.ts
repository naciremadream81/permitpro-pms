/**
 * File Storage Abstraction Layer
 * 
 * This module provides an abstraction for file storage operations, allowing
 * easy migration from local file storage to cloud storage (e.g., S3) in the future.
 * 
 * Current implementation: Local file system storage
 * Future: Can be swapped to S3 or other cloud storage providers
 */

import fs from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'
import { MAX_UPLOAD_BYTES } from './api-security'

// Storage configuration
const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage')
const MAX_FILE_SIZE = MAX_UPLOAD_BYTES

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
 * Local File System Storage Adapter
 * 
 * Stores files in a directory structure: storage/permits/{permitId}/{fileName}
 */
export class LocalStorageAdapter implements StorageAdapter {
  private rootPath: string

  constructor(rootPath: string) {
    this.rootPath = rootPath
  }

  /**
   * Ensure the storage directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    // Callers pass path.resolve()'d absolute dirs already validated to stay
    // under STORAGE_ROOT. Do not treat absolute paths as invalid (Aikido
    // autofix did that, then caught the throw and mkdir'd anyway — a noop).
    await fs.mkdir(dirPath, { recursive: true })
  }

  /**
   * Generate a unique file name to prevent collisions
   */
  private generateUniqueFileName(originalName: string): string {
    const ext = path.extname(originalName)
    const baseName = path.basename(originalName, ext)
    const timestamp = Date.now()
    const random = randomBytes(4).toString('hex')
    return `${baseName}_${timestamp}_${random}${ext}`
  }

  /**
   * Resolve a storage-relative path and reject anything outside the root.
   * Uses path.relative (not string prefix) so `/storage` cannot match `/storage-evil`.
   */
  private resolveWithinRoot(filePath: string): string {
    const base = path.resolve(this.rootPath)
    const target = path.resolve(base, filePath)
    const relative = path.relative(base, target)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Invalid file path: outside storage root')
    }
    return target
  }

  /**
   * Save a file to local storage
   * @param file - File buffer to save
   * @param fileName - Original file name
   * @param permitId - Permit package ID for organization
   * @returns Storage path relative to root
   */
  async save(file: Buffer, fileName: string, permitId: string): Promise<string> {
    // Validate file size
    if (file.length > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Create permit-specific directory
    const baseDir = path.resolve(this.rootPath, 'permits')
    const permitDir = path.resolve(baseDir, permitId)
    const relativePermitDir = path.relative(baseDir, permitDir)
    if (relativePermitDir.startsWith('..') || path.isAbsolute(relativePermitDir)) {
      throw new Error('Invalid permit identifier')
    }
    await this.ensureDirectory(permitDir)

    // Generate unique file name
    const uniqueFileName = this.generateUniqueFileName(fileName)
    const filePath = path.resolve(permitDir, uniqueFileName)
    const relativeFilePath = path.relative(baseDir, filePath)
    if (relativeFilePath.startsWith('..') || path.isAbsolute(relativeFilePath)) {
      throw new Error('Invalid file name')
    }

    // Write file
    await fs.writeFile(filePath, file)

    // Return relative path for database storage
    return path.join('permits', permitId, uniqueFileName)
  }

  /**
   * Retrieve a file from local storage
   * @param filePath - Relative path from storage root
   * @returns File buffer
   */
  async get(filePath: string): Promise<Buffer> {
    const target = this.resolveWithinRoot(filePath)
    return await fs.readFile(target)
  }

  /**
   * Delete a file from local storage
   * @param filePath - Relative path from storage root
   */
  async delete(filePath: string): Promise<void> {
    const target = this.resolveWithinRoot(filePath)

    try {
      await fs.unlink(target)
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
    try {
      await fs.access(this.resolveWithinRoot(filePath))
      return true
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid file path')) {
        return false
      }
      return false
    }
  }
}

/**
 * S3 Storage Adapter (Future implementation)
 * 
 * This is a placeholder for future S3 integration.
 * Uncomment and implement when ready to migrate to cloud storage.
 */
/*
class S3StorageAdapter implements StorageAdapter {
  // TODO: Implement S3 storage
  async save(file: Buffer, fileName: string, permitId: string): Promise<string> {
    // Implementation for S3
  }
  
  async get(filePath: string): Promise<Buffer> {
    // Implementation for S3
  }
  
  async delete(filePath: string): Promise<void> {
    // Implementation for S3
  }
  
  async exists(filePath: string): Promise<boolean> {
    // Implementation for S3
  }
}
*/

// Export the storage adapter instance
// Switch between LocalStorageAdapter and S3StorageAdapter based on environment
const storageAdapter: StorageAdapter = new LocalStorageAdapter(STORAGE_ROOT)

// Initialize storage root directory on module load
fs.mkdir(STORAGE_ROOT, { recursive: true }).catch(console.error)

export const storage = storageAdapter

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
