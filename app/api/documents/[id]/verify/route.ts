/**
 * Document Verification API Route Handler
 * 
 * Handles POST requests to verify or unverify documents.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { documentVerifySchema } from '@/lib/validations'
import { handleApiError, requirePermission } from '@/lib/api-security'
import { syncChecklistItemsForDocumentVerification } from '@/lib/checklist-engine'

// POST /api/documents/[id]/verify - Verify or unverify a document
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'verify', 'document')

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

    // Update document + linked checklist rows together. Readiness requires both
    // a Verified document and ChecklistItem.status VERIFIED; verifying only the
    // document left packages permanently blocked from review approve.
    const document = await prisma.$transaction(async (tx) => {
      const updated = await tx.permitDocument.update({
        where: { id: params.id },
        data: {
          isVerified: validatedData.isVerified,
          status: validatedData.isVerified ? 'Verified' : 'Pending',
          notes: validatedData.notes || currentDocument.notes,
        },
      })

      await syncChecklistItemsForDocumentVerification(
        params.id,
        validatedData.isVerified,
        tx
      )

      await tx.activityLog.create({
        data: {
          permitPackageId: updated.permitPackageId,
          userId: session.user.id,
          activityType: 'DocumentVerified',
          description: `Document "${updated.fileName}" ${validatedData.isVerified ? 'verified' : 'unverified'}${validatedData.notes ? `: ${validatedData.notes}` : ''}`,
        },
      })

      return updated
    })

    return NextResponse.json({ data: document })
  } catch (error) {
    return handleApiError(error, 'Failed to verify document', { notFoundMessage: 'Document not found' })
  }
}

