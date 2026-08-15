/**
 * Document Download API Route Handler
 * 
 * Handles GET requests to download documents from storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { handleApiError, requirePermission, sanitizeContentDispositionFilename } from '@/lib/api-security'

// GET /api/documents/[id]/download - Download document file
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    // Get file from storage
    const fileBuffer = await storage.get(document.storagePath)

    const safeName = sanitizeContentDispositionFilename(document.fileName)
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': document.fileSize.toString(),
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to download document', { notFoundMessage: 'Document not found' })
  }
}

