/**
 * Document Detail API Route Handler
 * 
 * Handles GET (get document), PATCH (update document metadata), and DELETE (delete document) requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { documentUpdateSchema } from '@/lib/validations'
import { handleApiError, requirePermission } from '@/lib/api-security'

// GET /api/documents/[id] - Get document by ID
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
      include: {
        permitPackage: {
          select: { id: true, projectName: true },
        },
        uploadedByUser: {
          select: { id: true, name: true, email: true },
        },
        parentDocument: {
          select: { id: true, fileName: true, versionTag: true },
        },
        childDocuments: {
          select: { id: true, fileName: true, versionTag: true, uploadedAt: true },
          orderBy: { uploadedAt: 'asc' },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({ data: document })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch document', { notFoundMessage: 'Document not found' })
  }
}

// PATCH /api/documents/[id] - Update document metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'update', 'document')

    const body = await request.json()
    
    // Validate request data
    const validatedData = documentUpdateSchema.parse(body)

    // Get current document
    const currentDocument = await prisma.permitDocument.findUnique({
      where: { id: params.id },
    })

    if (!currentDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Update document
    const document = await prisma.permitDocument.update({
      where: { id: params.id },
      data: validatedData,
    })

    // Create activity log entry if verification status changed
    if (validatedData.isVerified !== undefined && validatedData.isVerified !== currentDocument.isVerified) {
      await prisma.activityLog.create({
        data: {
          permitPackageId: document.permitPackageId,
          userId: session.user.id,
          activityType: 'DocumentVerified',
          description: `Document "${document.fileName}" ${validatedData.isVerified ? 'verified' : 'unverified'}`,
        },
      })
    }

    return NextResponse.json({ data: document })
  } catch (error) {
    return handleApiError(error, 'Failed to update document', { notFoundMessage: 'Document not found' })
  }
}

// DELETE /api/documents/[id] - Delete document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'delete', 'document')

    const document = await prisma.permitDocument.findUnique({
      where: { id: params.id },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Persist DB changes before touching storage. Deleting the blob first left
    // ghost rows when Prisma rejected the delete (checklist/review/version FKs).
    await prisma.$transaction(async (tx) => {
      await tx.checklistItem.updateMany({
        where: { documentId: params.id },
        data: { documentId: null },
      })
      await tx.reviewComment.updateMany({
        where: { documentId: params.id },
        data: { documentId: null },
      })
      await tx.permitDocument.updateMany({
        where: { parentDocumentId: params.id },
        data: { parentDocumentId: null },
      })
      await tx.permitDocument.delete({
        where: { id: params.id },
      })
      await tx.activityLog.create({
        data: {
          permitPackageId: document.permitPackageId,
          userId: session.user.id,
          activityType: 'FieldUpdated',
          description: `Document "${document.fileName}" deleted`,
        },
      })
    })

    try {
      await storage.delete(document.storagePath)
    } catch (error) {
      console.error('Error deleting file from storage after DB delete:', error)
      // Row is already gone — orphan blob is recoverable; ghost row is not.
    }

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'Failed to delete document', { notFoundMessage: 'Document not found' })
  }
}

