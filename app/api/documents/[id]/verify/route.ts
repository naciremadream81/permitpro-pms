/**
 * Document Verification API Route Handler
 * 
 * Handles POST requests to verify or unverify documents.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { documentVerifySchema } from '@/lib/validations'

// POST /api/documents/[id]/verify - Verify or unverify a document
export async function POST(
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
    const validatedData = documentVerifySchema.parse(body)

    // Get current document
    const currentDocument = await prisma.permitDocument.findUnique({
      where: { id: params.id },
    })

    if (!currentDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Update document verification status
    const document = await prisma.permitDocument.update({
      where: { id: params.id },
      data: {
        isVerified: validatedData.isVerified,
        status: validatedData.isVerified ? 'Verified' : 'Pending',
        notes: validatedData.notes || currentDocument.notes,
      },
    })

    // Create activity log entry
    await prisma.activityLog.create({
      data: {
        permitPackageId: document.permitPackageId,
        userId: session.user.id,
        activityType: 'DocumentVerified',
        description: `Document "${document.fileName}" ${validatedData.isVerified ? 'verified' : 'unverified'}${validatedData.notes ? `: ${validatedData.notes}` : ''}`,
      },
    })

    return NextResponse.json({ data: document })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    console.error('Error verifying document:', error)
    return NextResponse.json(
      { error: 'Failed to verify document' },
      { status: 500 }
    )
  }
}

