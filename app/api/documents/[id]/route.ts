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
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
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
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    if ((error as any)?.code === 'P2025') {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
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

    const document = await prisma.permitDocument.findUnique({
      where: { id: params.id },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete file from storage
    try {
      await storage.delete(document.storagePath)
    } catch (error) {
      console.error('Error deleting file from storage:', error)
      // Continue with database deletion even if file deletion fails
    }

    // Delete document record
    await prisma.permitDocument.delete({
      where: { id: params.id },
    })

    // Create activity log entry
    await prisma.activityLog.create({
      data: {
        permitPackageId: document.permitPackageId,
        userId: session.user.id,
        activityType: 'FieldUpdated',
        description: `Document "${document.fileName}" deleted`,
      },
    })

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}

