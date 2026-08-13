/**
 * Document Preview API Route Handler
 * 
 * Handles GET requests to preview documents (for PDFs and images).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { isPreviewable, sanitizeFileName, storage } from '@/lib/storage'

// GET /api/documents/[id]/preview - Preview document (for PDFs and images)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const document = await prisma.permitDocument.findUnique({
      where: { id: (await params).id },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if file is previewable
    if (!isPreviewable(document.fileName)) {
      return NextResponse.json(
        { error: 'File type not previewable' },
        { status: 400 }
      )
    }

    // Get file from storage
    const fileBuffer = await storage.get(document.storagePath)
    const fileName = sanitizeFileName(document.fileName)

    // Return file with appropriate headers for inline viewing
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Content-Length': document.fileSize.toString(),
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Error previewing document:', error)
    return NextResponse.json(
      { error: 'Failed to preview document' },
      { status: 500 }
    )
  }
}
