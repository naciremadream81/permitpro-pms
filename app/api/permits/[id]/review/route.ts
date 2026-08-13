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
import { evaluateReadiness } from '@/lib/readiness-engine'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const assignments = await prisma.reviewAssignment.findMany({
      where: { packageId: (await params).id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = normalizeRole(session.user?.role)
    const body = await request.json()

    const permit = await prisma.permitPackage.findUnique({ where: { id: (await params).id } })
    if (!permit) return NextResponse.json({ error: 'Permit not found' }, { status: 404 })

    // ── Assign reviewer ──────────────────────────────────────────────────
    if (body.reviewerId) {
      enforce(role, 'assign_reviewer', 'review')

      const data = reviewAssignSchema.parse(body)

      // Validate readiness before assigning (unless admin overrides)
      const readiness = await evaluateReadiness((await params).id)
      if (!readiness.isReady && !body.overrideReadiness) {
        return NextResponse.json(
          {
            error: 'Package is not ready for review',
            blockers: readiness.blockers,
            warnings: readiness.warnings,
          },
          { status: 422 }
        )
      }

      if (body.overrideReadiness) {
        enforce(role, 'override_readiness', 'checklist')
        await prisma.activityLog.create({
          data: {
            permitPackageId: (await params).id,
            userId: session.user.id,
            activityType: 'ReadinessOverridden',
            description: `Readiness gate overridden by admin`,
            metadata: JSON.stringify({ reason: body.overrideReason, blockers: readiness.blockers }),
          },
        })
      }

      const assignment = await prisma.reviewAssignment.create({
        data: {
          packageId: (await params).id,
          reviewerId: data.reviewerId,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          status: 'ASSIGNED',
        },
        include: {
          reviewer: { select: { id: true, name: true, email: true } },
        },
      })

      // Move the package into review (not "ready to submit" — that happens on approval)
      await prisma.permitPackage.update({
        where: { id: (await params).id },
        data: { internalStage: 'InProgress', lastActivityAt: new Date() },
      })

      await prisma.activityLog.create({
        data: {
          permitPackageId: (await params).id,
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
        packageId: (await params).id,
        reviewerId: session.user.id,
        status: { in: ['ASSIGNED', 'IN_REVIEW'] },
      },
      include: { comments: { where: { isResolved: false } } },
    })

    // Admins can act on any assignment
    const adminAssignment =
      role === 'admin'
        ? await prisma.reviewAssignment.findFirst({
            where: { packageId: (await params).id, status: { in: ['ASSIGNED', 'IN_REVIEW'] } },
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
          permitPackageId: (await params).id,
          userId: session.user.id,
          activityType: 'ReviewStarted',
          description: 'Review started',
        },
      })

      return NextResponse.json({ data: updated })
    }

    if (action === 'approve') {
      // Approval is the verification step: documents that were uploaded and
      // awaiting review are now confirmed good, and their checklist items move
      // from UPLOADED → VERIFIED. This is what flips the "Pending" badges in
      // the Documents section once a reviewer signs off.
      const [updated, verifiedDocs, verifiedItems] = await prisma.$transaction([
        prisma.reviewAssignment.update({
          where: { id: activeAssignment.id },
          data: { status: 'APPROVED', completedAt: new Date() },
        }),
        prisma.permitDocument.updateMany({
          where: { permitPackageId: (await params).id, status: 'Pending' },
          data: { status: 'Verified', isVerified: true },
        }),
        prisma.checklistItem.updateMany({
          where: { packageId: (await params).id, status: 'UPLOADED' },
          data: { status: 'VERIFIED' },
        }),
        prisma.permitPackage.update({
          where: { id: (await params).id },
          data: { internalStage: 'ReadyToSubmit', lastActivityAt: new Date() },
        }),
      ])

      await prisma.activityLog.create({
        data: {
          permitPackageId: (await params).id,
          userId: session.user.id,
          activityType: 'ReviewApproved',
          description: note
            ? `Review approved: ${note}`
            : `Review approved — ${verifiedDocs.count} document(s) verified, package ready for county submission`,
        },
      })

      return NextResponse.json({
        data: updated,
        verifiedDocuments: verifiedDocs.count,
        verifiedChecklistItems: verifiedItems.count,
      })
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
        where: { id: (await params).id },
        data: { internalStage: 'InProgress', lastActivityAt: new Date() },
      })

      await prisma.activityLog.create({
        data: {
          permitPackageId: (await params).id,
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
