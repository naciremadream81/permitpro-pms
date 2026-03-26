/**
 * Bulk Permits API — POST
 *
 * Supported actions:
 *   reassign_coordinator  — move packages to a new coordinator
 *   update_stage          — change internalStage for a batch
 *   add_task              — add the same task to multiple packages
 *
 * All bulk operations write a single batched ActivityLog entry per package.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { internalStageEnum } from '@/lib/validations'

const bulkSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('reassign_coordinator'),
    packageIds: z.array(z.string()).min(1).max(100),
    coordinatorId: z.string().min(1),
  }),
  z.object({
    action: z.literal('update_stage'),
    packageIds: z.array(z.string()).min(1).max(100),
    internalStage: internalStageEnum,
    note: z.string().optional(),
  }),
  z.object({
    action: z.literal('add_task'),
    packageIds: z.array(z.string()).min(1).max(100),
    taskName: z.string().min(1),
    taskDescription: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    dueDate: z.string().datetime().optional(),
  }),
])

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'bulk', 'package')

    const body = await request.json()
    const data = bulkSchema.parse(body)

    const now = new Date()
    let affectedCount = 0

    if (data.action === 'reassign_coordinator') {
      // Verify coordinator exists
      const coordinator = await prisma.user.findUnique({
        where: { id: data.coordinatorId },
        select: { id: true, name: true },
      })
      if (!coordinator)
        return NextResponse.json({ error: 'Coordinator not found' }, { status: 404 })

      await prisma.permitPackage.updateMany({
        where: { id: { in: data.packageIds } },
        data: { coordinatorId: data.coordinatorId, lastActivityAt: now },
      })

      // Log each
      await prisma.activityLog.createMany({
        data: data.packageIds.map((id) => ({
          permitPackageId: id,
          userId: session.user.id,
          activityType: 'FieldUpdated' as const,
          description: `Bulk reassigned to coordinator ${coordinator.name}`,
          metadata: JSON.stringify({ action: 'reassign_coordinator', coordinatorId: data.coordinatorId }),
        })),
      })

      affectedCount = data.packageIds.length
    }

    if (data.action === 'update_stage') {
      const packages = await prisma.permitPackage.findMany({
        where: { id: { in: data.packageIds } },
        select: { id: true, internalStage: true },
      })

      await prisma.permitPackage.updateMany({
        where: { id: { in: data.packageIds } },
        data: { internalStage: data.internalStage, lastActivityAt: now },
      })

      await prisma.activityLog.createMany({
        data: packages.map((pkg) => ({
          permitPackageId: pkg.id,
          userId: session.user.id,
          activityType: 'StageChange' as const,
          description: data.note
            ? `Bulk stage update: ${data.note} (${pkg.internalStage} → ${data.internalStage})`
            : `Bulk stage update: ${pkg.internalStage ?? 'none'} → ${data.internalStage}`,
          oldValue: pkg.internalStage ?? undefined,
          newValue: data.internalStage,
          metadata: JSON.stringify({ action: 'bulk_update_stage' }),
        })),
      })

      affectedCount = packages.length
    }

    if (data.action === 'add_task') {
      await prisma.task.createMany({
        data: data.packageIds.map((id) => ({
          permitPackageId: id,
          name: data.taskName,
          description: data.taskDescription,
          priority: data.priority,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          status: 'NotStarted' as const,
        })),
      })

      await prisma.activityLog.createMany({
        data: data.packageIds.map((id) => ({
          permitPackageId: id,
          userId: session.user.id,
          activityType: 'TaskCreated' as const,
          description: `Bulk task added: "${data.taskName}"`,
          metadata: JSON.stringify({ action: 'bulk_add_task', taskName: data.taskName }),
        })),
      })

      await prisma.permitPackage.updateMany({
        where: { id: { in: data.packageIds } },
        data: { lastActivityAt: now },
      })

      affectedCount = data.packageIds.length
    }

    return NextResponse.json({ success: true, affected: affectedCount })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('POST /api/permits/bulk:', error)
    return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 })
  }
}
