/**
 * Document Preview API Route Handler
 * 
 * Handles GET requests to preview documents (for PDFs and images).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { storage, isPreviewable } from '@/lib/storage'
import { handleApiError, requirePermission, sanitizeContentDispositionFilename } from '@/lib/api-security'

// GET /api/documents/[id]/preview - Preview document (for PDFs and images)
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
    requirePermission(session, 'read', 'document')

    const document = await prisma.permitDocument.findUnique({
      where: { id: params.id },
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

    const safeName = sanitizeContentDispositionFilename(document.fileName)
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `inline; filename="${safeName}"`,
        'Content-Length': document.fileSize.toString(),
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to preview document', { notFoundMessage: 'Document not found' })
  }
}

