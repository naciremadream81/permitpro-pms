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

// Storage configuration
const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage')
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
    const permitDir = path.join(this.rootPath, 'permits', permitId)
    await this.ensureDirectory(permitDir)

    // Generate unique file name
    const uniqueFileName = this.generateUniqueFileName(fileName)
    const filePath = path.join(permitDir, uniqueFileName)

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

