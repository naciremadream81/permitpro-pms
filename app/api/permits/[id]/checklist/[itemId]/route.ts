/**
 * Checklist Item API — PATCH update / waive
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { checklistItemUpdateSchema, checklistItemWaiveSchema } from '@/lib/validations'
import { syncChecklistItemsForDocumentVerification } from '@/lib/checklist-engine'

// PATCH /api/permits/[id]/checklist/[itemId]
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string; itemId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = normalizeRole(session.user?.role)
    const body = await request.json()

    // WAIVED / NOT_APPLICABLE both skip readiness — admin-only with reason
    if (
      body.status === 'WAIVED' ||
      body.status === 'NOT_APPLICABLE' ||
      body.waiverReason
    ) {
      enforce(role, 'waive_item', 'checklist')

      const { status: waiveStatus, waiverReason } = checklistItemWaiveSchema.parse(body)

      const item = await prisma.checklistItem.update({
        where: { id: params.itemId, packageId: params.id },
        data: {
          status: waiveStatus,
          waiverReason,
          waivedBy: session.user.id,
          waivedAt: new Date(),
        },
        include: { requirement: { select: { documentName: true } } },
      })

      await prisma.activityLog.create({
        data: {
          permitPackageId: params.id,
          userId: session.user.id,
          activityType: 'ChecklistItemWaived',
          description: `Checklist item "${item.requirement.documentName}" marked ${waiveStatus}`,
          metadata: JSON.stringify({
            checklistItemId: item.id,
            status: waiveStatus,
            waiverReason,
          }),
        },
      })

      return NextResponse.json({ data: item })
    }

    // Standard update (coordinator or admin)
    enforce(role, 'update', 'checklist')

    const data = checklistItemUpdateSchema.parse(body)

    // Documents must belong to this package and match the requirement category —
    // otherwise readiness can be satisfied by linking an unrelated verified doc.
    const existingItem = await prisma.checklistItem.findFirst({
      where: { id: params.itemId, packageId: params.id },
      select: {
        id: true,
        documentId: true,
        requirement: { select: { documentCategory: true, documentName: true } },
      },
    })
    if (!existingItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const requiresLinkedDocument =
      !!data.documentId || data.status === 'VERIFIED' || data.status === 'UPLOADED'
    const documentIdProvided = Object.prototype.hasOwnProperty.call(data, 'documentId')
    const targetDocumentId = documentIdProvided
      ? data.documentId ?? undefined
      : existingItem.documentId ?? undefined

    let linkedDoc: {
      id: string
      category: string
      isVerified: boolean
      status: string
    } | null = null

    if (requiresLinkedDocument) {
      if (!targetDocumentId) {
        return NextResponse.json(
          { error: 'A document must be linked before marking this checklist item verified' },
          { status: 400 }
        )
      }
      linkedDoc = await prisma.permitDocument.findFirst({
        where: { id: targetDocumentId, permitPackageId: params.id },
        select: { id: true, category: true, isVerified: true, status: true },
      })
      if (!linkedDoc) {
        return NextResponse.json(
          { error: 'Document must belong to this permit package' },
          { status: 400 }
        )
      }
      if (linkedDoc.category !== existingItem.requirement.documentCategory) {
        return NextResponse.json(
          {
            error: `Document category "${linkedDoc.category}" does not match required "${existingItem.requirement.documentCategory}"`,
          },
          { status: 400 }
        )
      }
    }

    const liveVerified =
      !!linkedDoc && linkedDoc.isVerified && linkedDoc.status === 'Verified'

    // Linking an already-verified document (or explicitly marking VERIFIED)
    // must land on VERIFIED so ReadyToSubmit is reachable from the UI path
    // that otherwise only sends UPLOADED.
    let nextStatus = data.status
    if (
      targetDocumentId &&
      liveVerified &&
      (nextStatus === 'UPLOADED' || nextStatus === undefined)
    ) {
      nextStatus = 'VERIFIED'
    }

    const itemInclude = {
      requirement: { select: { documentName: true } },
      document: {
        select: { id: true, fileName: true, status: true, isVerified: true, category: true },
      },
    } as const

    const itemData = {
      ...(nextStatus ? { status: nextStatus } : {}),
      ...(data.documentId !== undefined ? { documentId: data.documentId } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    }

    const item =
      nextStatus === 'VERIFIED' && targetDocumentId
        ? await prisma.$transaction(async (tx) => {
            if (!liveVerified) {
              await tx.permitDocument.update({
                where: { id: targetDocumentId },
                data: { isVerified: true, status: 'Verified' },
              })
            }
            await syncChecklistItemsForDocumentVerification(targetDocumentId, true, tx)
            return tx.checklistItem.update({
              where: { id: params.itemId, packageId: params.id },
              data: itemData,
              include: itemInclude,
            })
          })
        : await prisma.checklistItem.update({
            where: { id: params.itemId, packageId: params.id },
            data: itemData,
            include: itemInclude,
          })

    await prisma.activityLog.create({
      data: {
        permitPackageId: params.id,
        userId: session.user.id,
        activityType: 'ChecklistItemUpdated',
        description: `Checklist item "${item.requirement.documentName}" updated to ${item.status}`,
        metadata: JSON.stringify({ checklistItemId: item.id, status: item.status }),
      },
    })

    // Update package lastActivityAt
    await prisma.permitPackage.update({
      where: { id: params.id },
      data: { lastActivityAt: new Date() },
    })

    return NextResponse.json({ data: item })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('PATCH /api/permits/[id]/checklist/[itemId]:', error)
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 })
  }
}
