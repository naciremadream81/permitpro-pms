/**
 * Download All Documents as ZIP API Route Handler
 * 
 * Handles GET requests to download all documents for a permit package as a ZIP file.
 * This is useful for submitting permit packages or emailing them.
 * 
 * The ZIP file will contain all documents organized by category, with descriptive filenames
 * that include the document category for easy identification.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import archiver from 'archiver'

// GET /api/permits/[id]/documents/download-all - Download all documents as ZIP
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify permit exists
    const permit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
      include: {
        documents: {
          orderBy: [
            { category: 'asc' },
            { uploadedAt: 'asc' },
          ],
        },
      },
    })

    if (!permit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    // If no documents, return error
    if (permit.documents.length === 0) {
      return NextResponse.json(
        { error: 'No documents found for this permit package' },
        { status: 404 }
      )
    }

    // Create archiver instance with maximum compression
    const archive = archiver('zip', {
      zlib: { level: 9 },
    })

    // Collect ZIP data in chunks
    const chunks: Buffer[] = []
    
    archive.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    // Create a promise to wait for archive completion
    // This promise resolves when the 'end' event is emitted with the final buffer
    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => {
        const zipBuffer = Buffer.concat(chunks)
        resolve(zipBuffer)
      })
      
      archive.on('error', (err) => {
        console.error('Archive error:', err)
        reject(err)
      })
    })

    // Add each document to the archive
    for (const document of permit.documents) {
      try {
        // Get file from storage
        const fileBuffer = await storage.get(document.storagePath)
        
        // Create a descriptive file name that includes category and original name
        // Format: {category}_{originalFileName}
        // This makes it easy to identify documents when extracting the ZIP
        const categoryPrefix = document.category.replace(/\s+/g, '_')
        const safeFileName = document.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
        const archiveFileName = `${categoryPrefix}_${safeFileName}`
        
        // Add file to archive
        archive.append(fileBuffer, { name: archiveFileName })
      } catch (error) {
        console.error(`Error adding document ${document.id} to archive:`, error)
        // Continue with other documents even if one fails
      }
    }

    // Finalize the archive and await the promise
    // finalize() returns a Promise that resolves when the archiving process completes
    // We await it to properly handle any errors that might occur during finalization
    // This prevents unhandled promise rejections and ensures proper error handling
    await archive.finalize()

    // Wait for the archive to complete and get the final buffer
    // The 'end' event will be emitted after finalize() completes successfully
    const zipBuffer = await archivePromise

    // Generate a safe filename for the ZIP
    // Format: {ProjectName}_PermitPackage_{Date}.zip
    const permitName = permit.projectName.replace(/[^a-zA-Z0-9]/g, '_')
    const dateStr = new Date().toISOString().split('T')[0]
    const zipFileName = `${permitName}_PermitPackage_${dateStr}.zip`

    // Return the ZIP file
    return new NextResponse(zipBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Content-Length': zipBuffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Error creating document ZIP:', error)
    return NextResponse.json(
      { error: 'Failed to create document package' },
      { status: 500 }
    )
  }
}

