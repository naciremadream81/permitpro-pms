/**
 * Document Download API Route Handler
 * 
 * Handles GET requests to download documents from storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { sanitizeFileName, storage } from '@/lib/storage'

// GET /api/documents/[id]/download - Download document file
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

    const document = await prisma.permitDocument.findUnique({
      where: { id: params.id },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get file from storage
    const fileBuffer = await storage.get(document.storagePath)
    const fileName = sanitizeFileName(document.fileName)

    // Return file with appropriate headers
    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': document.fileType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': document.fileSize.toString(),
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Error downloading document:', error)
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    )
  }
}
