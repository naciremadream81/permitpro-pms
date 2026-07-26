/**
 * Permit Status Update API Route Handler
 *
 * Handles POST requests to update permit status with:
 * - Readiness gate enforcement for ReadyToSubmit transitions
 * - Admin override capability (with required reason)
 * - Automatic activity logging
 * - Optional task automation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { permitStatusUpdateSchema } from '@/lib/validations'
import { gateReadyToSubmit } from '@/lib/readiness-engine'
import { Prisma } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = normalizeRole(session.user?.role)
    enforce(role, 'update', 'package')

    const body = await request.json()
    const validatedData = permitStatusUpdateSchema.parse(body)

    const currentPermit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
    })
    if (!currentPermit)
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })

    // ── Readiness gate ────────────────────────────────────────────────────
    // Enforce when transitioning internalStage to ReadyToSubmit
    const transitioningToReady = validatedData.internalStage === 'ReadyToSubmit'

    if (transitioningToReady) {
      const gate = await gateReadyToSubmit(params.id, {
        overrideReadiness: validatedData.overrideReadiness,
        overrideReason: validatedData.overrideReason,
      })

      if (!gate.ok) {
        return NextResponse.json(gate.body, { status: gate.status })
      }

      if (!gate.readiness.isReady && validatedData.overrideReadiness) {
        enforce(role, 'override_readiness', 'checklist')
        await prisma.activityLog.create({
          data: {
            permitPackageId: params.id,
            userId: session.user.id,
            activityType: 'ReadinessOverridden',
            description: `Readiness gate overridden: ${validatedData.overrideReason}`,
            metadata: JSON.stringify({
              blockers: gate.readiness.blockers,
              overrideReason: validatedData.overrideReason,
            }),
          },
        })
      }
    }

    // ── Apply update ──────────────────────────────────────────────────────
    const updateData: Prisma.PermitPackageUpdateInput = {
      status: validatedData.status,
      lastActivityAt: new Date(),
    }
    if (validatedData.internalStage) {
      updateData.internalStage = validatedData.internalStage
    }

    const permitPackage = await prisma.permitPackage.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        contractor: { select: { id: true, companyName: true } },
      },
    })

    // ── Activity log ──────────────────────────────────────────────────────
    const description = validatedData.note
      ? `${validatedData.note} (Status: ${currentPermit.status} → ${permitPackage.status})`
      : `Status changed from ${currentPermit.status} to ${permitPackage.status}`

    await prisma.activityLog.create({
      data: {
        permitPackageId: permitPackage.id,
        userId: session.user.id,
        activityType: 'StatusChange',
        description,
        oldValue: currentPermit.status,
        newValue: permitPackage.status,
        metadata: validatedData.internalStage
          ? JSON.stringify({ internalStage: validatedData.internalStage })
          : undefined,
      },
    })

    // Log stage change separately if present
    if (validatedData.internalStage && validatedData.internalStage !== currentPermit.internalStage) {
      await prisma.activityLog.create({
        data: {
          permitPackageId: permitPackage.id,
          userId: session.user.id,
          activityType: 'StageChange',
          description: `Stage changed from ${currentPermit.internalStage ?? 'none'} to ${validatedData.internalStage}`,
          oldValue: currentPermit.internalStage ?? undefined,
          newValue: validatedData.internalStage,
        },
      })
    }

    // ── Workflow automation ───────────────────────────────────────────────
    if (validatedData.status === 'Approved') {
      const existingTask = await prisma.task.findFirst({
        where: { permitPackageId: permitPackage.id, name: 'Send to Billing' },
      })

      if (!existingTask) {
        await prisma.task.create({
          data: {
            permitPackageId: permitPackage.id,
            name: 'Send to Billing',
            description: 'Permit approved — send to billing department',
            status: 'NotStarted',
            priority: 'high',
          },
        })

        await prisma.activityLog.create({
          data: {
            permitPackageId: permitPackage.id,
            userId: session.user.id,
            activityType: 'TaskCreated',
            description: 'Task "Send to Billing" auto-created',
          },
        })
      }
    }

    return NextResponse.json({ data: permitPackage })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('POST /api/permits/[id]/status:', error)
    return NextResponse.json({ error: 'Failed to update permit status' }, { status: 500 })
  }
}
