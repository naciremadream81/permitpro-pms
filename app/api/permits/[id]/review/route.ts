/**
 * Review Assignment API
 *
 * GET  — list review assignments for a package
 * POST — assign a reviewer (ADMIN only) or take an action (start / approve / send_back)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { reviewAssignSchema, reviewActionSchema } from '@/lib/validations'
import { gateReadyToSubmit } from '@/lib/readiness-engine'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const assignments = await prisma.reviewAssignment.findMany({
      where: { packageId: params.id },
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true } },
            document: { select: { id: true, fileName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { assignedAt: 'desc' },
    })

    return NextResponse.json({ data: assignments })
  } catch (error) {
    console.error('GET /api/permits/[id]/review:', error)
    return NextResponse.json({ error: 'Failed to fetch review assignments' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = normalizeRole(session.user?.role)
    const body = await request.json()

    const permit = await prisma.permitPackage.findUnique({ where: { id: params.id } })
    if (!permit) return NextResponse.json({ error: 'Permit not found' }, { status: 404 })

    // ── Assign reviewer ──────────────────────────────────────────────────
    if (body.reviewerId) {
      enforce(role, 'assign_reviewer', 'review')

      const data = reviewAssignSchema.parse(body)

      // Validate readiness before assigning (unless admin overrides with reason)
      const gate = await gateReadyToSubmit(params.id, {
        overrideReadiness: body.overrideReadiness === true,
        overrideReason: typeof body.overrideReason === 'string' ? body.overrideReason : undefined,
      })
      if (!gate.ok) {
        return NextResponse.json(
          {
            ...gate.body,
            error:
              gate.status === 422
                ? 'Package is not ready for review'
                : gate.body.error,
          },
          { status: gate.status }
        )
      }

      if (!gate.readiness.isReady && body.overrideReadiness === true) {
        enforce(role, 'override_readiness', 'checklist')
        await prisma.activityLog.create({
          data: {
            permitPackageId: params.id,
            userId: session.user.id,
            activityType: 'ReadinessOverridden',
            description: `Readiness gate overridden by admin: ${body.overrideReason}`,
            metadata: JSON.stringify({
              reason: body.overrideReason,
              blockers: gate.readiness.blockers,
            }),
          },
        })
      }

      const assignment = await prisma.reviewAssignment.create({
        data: {
          packageId: params.id,
          reviewerId: data.reviewerId,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          status: 'ASSIGNED',
        },
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
        },
      })

      // Update package stage
      await prisma.permitPackage.update({
        where: { id: params.id },
        data: { internalStage: 'ReadyToSubmit', lastActivityAt: new Date() },
      })

      await prisma.activityLog.create({
        data: {
          permitPackageId: params.id,
          userId: session.user.id,
          activityType: 'ReviewAssigned',
          description: `Review assigned to ${assignment.reviewer.name}`,
          metadata: JSON.stringify({ assignmentId: assignment.id, reviewerId: data.reviewerId }),
        },
      })

      return NextResponse.json({ data: assignment }, { status: 201 })
    }

    // ── Reviewer actions: start / approve / send_back ────────────────────
    const { action, note } = reviewActionSchema.parse(body)

    // Find the active assignment for this reviewer
    const assignment = await prisma.reviewAssignment.findFirst({
      where: {
        packageId: params.id,
        reviewerId: session.user.id,
        status: { in: ['ASSIGNED', 'IN_REVIEW'] },
      },
      include: { comments: { where: { isResolved: false } } },
    })

    // Admins can act on any assignment
    const adminAssignment =
      role === 'admin'
        ? await prisma.reviewAssignment.findFirst({
            where: { packageId: params.id, status: { in: ['ASSIGNED', 'IN_REVIEW'] } },
            include: { comments: { where: { isResolved: false } } },
            orderBy: { assignedAt: 'desc' },
          })
        : null

    const activeAssignment = assignment || adminAssignment

    if (!activeAssignment) {
      return NextResponse.json({ error: 'No active review assignment found' }, { status: 404 })
    }

    enforce(role, action === 'start' ? 'start_review' : action === 'approve' ? 'approve' : 'send_back', 'review')

    if (action === 'start') {
      const updated = await prisma.reviewAssignment.update({
        where: { id: activeAssignment.id },
        data: { status: 'IN_REVIEW', startedAt: new Date() },
      })

      await prisma.activityLog.create({
        data: {
          permitPackageId: params.id,
          userId: session.user.id,
          activityType: 'ReviewStarted',
          description: 'Review started',
        },
      })

      return NextResponse.json({ data: updated })
    }

    if (action === 'approve') {
      // Re-evaluate readiness — package may have regressed since assignment
      const gate = await gateReadyToSubmit(params.id)
      if (!gate.ok) {
        return NextResponse.json(
          {
            ...gate.body,
            error: 'Package is no longer ready for submission',
          },
          { status: gate.status }
        )
      }

      const updated = await prisma.reviewAssignment.update({
        where: { id: activeAssignment.id },
        data: { status: 'APPROVED', completedAt: new Date() },
      })

      await prisma.permitPackage.update({
        where: { id: params.id },
        data: { internalStage: 'ReadyToSubmit', lastActivityAt: new Date() },
      })

      await prisma.activityLog.create({
        data: {
          permitPackageId: params.id,
          userId: session.user.id,
          activityType: 'ReviewApproved',
          description: note
            ? `Review approved: ${note}`
            : 'Review approved — package ready for county submission',
        },
      })

      return NextResponse.json({ data: updated })
    }

    if (action === 'send_back') {
      if (!note || note.trim().length < 5) {
        return NextResponse.json(
          { error: 'A note is required when sending a package back for corrections' },
          { status: 400 }
        )
      }

      const updated = await prisma.reviewAssignment.update({
        where: { id: activeAssignment.id },
        data: { status: 'SENT_BACK', completedAt: new Date() },
      })

      // Create a review comment from the send-back note
      await prisma.reviewComment.create({
        data: {
          assignmentId: activeAssignment.id,
          authorId: session.user.id,
          body: note,
        },
      })

      await prisma.permitPackage.update({
        where: { id: params.id },
        data: { internalStage: 'InProgress', lastActivityAt: new Date() },
      })

      await prisma.activityLog.create({
        data: {
          permitPackageId: params.id,
          userId: session.user.id,
          activityType: 'ReviewSentBack',
          description: `Package sent back for corrections: ${note}`,
        },
      })

      return NextResponse.json({ data: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('POST /api/permits/[id]/review:', error)
    return NextResponse.json({ error: 'Failed to process review action' }, { status: 500 })
  }
}
