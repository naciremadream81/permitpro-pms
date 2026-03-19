/**
 * Checklist Item API — PATCH update / waive
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { checklistItemUpdateSchema, checklistItemWaiveSchema } from '@/lib/validations'

// PATCH /api/permits/[id]/checklist/[itemId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = normalizeRole(session.user?.role)
    const body = await request.json()

    // Waiver is admin-only
    if (body.status === 'WAIVED' || body.waiverReason) {
      enforce(role, 'waive_item', 'checklist')

      const { waiverReason } = checklistItemWaiveSchema.parse(body)

      const item = await prisma.checklistItem.update({
        where: { id: params.itemId, packageId: params.id },
        data: {
          status: 'WAIVED',
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
          description: `Checklist item "${item.requirement.documentName}" waived`,
          metadata: JSON.stringify({ checklistItemId: item.id, waiverReason }),
        },
      })

      return NextResponse.json({ data: item })
    }

    // Standard update (coordinator or admin)
    enforce(role, 'update', 'checklist')

    const data = checklistItemUpdateSchema.parse(body)

    const item = await prisma.checklistItem.update({
      where: { id: params.itemId, packageId: params.id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.documentId !== undefined ? { documentId: data.documentId } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: {
        requirement: { select: { documentName: true } },
        document: { select: { id: true, fileName: true, status: true, isVerified: true } },
      },
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
