/**
 * Review Comments API — GET / POST
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { reviewCommentSchema } from '@/lib/validations'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const comments = await prisma.reviewComment.findMany({
      where: { assignmentId: params.id },
      include: {
        author: { select: { id: true, name: true, role: true } },
        document: { select: { id: true, fileName: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: comments })
  } catch (error) {
    console.error('GET /api/review-assignments/[id]/comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
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
    // Comment authors must be able to participate in review (not merely read).
    // `review.read` alone let any reviewer inject unresolved comments onto others'
    // SENT_BACK assignments and permanently block ReadyToSubmit (reviewers cannot resolve).
    enforce(role, 'send_back', 'review')

    const assignment = await prisma.reviewAssignment.findUnique({
      where: { id: params.id },
    })
    if (!assignment)
      return NextResponse.json({ error: 'Review assignment not found' }, { status: 404 })

    // Only the assigned reviewer (or an admin acting for them) may comment.
    if (role !== 'admin' && assignment.reviewerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the assigned reviewer or an admin may add review comments' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = reviewCommentSchema.parse(body)

    // Pin targets must belong to this package — otherwise comments can reference
    // another permit's documents/checklist items and corrupt review state.
    if (data.documentId) {
      const document = await prisma.permitDocument.findFirst({
        where: { id: data.documentId, permitPackageId: assignment.packageId },
        select: { id: true },
      })
      if (!document) {
        return NextResponse.json(
          { error: 'documentId must belong to the same permit package as the review assignment' },
          { status: 400 }
        )
      }
    }

    if (data.checklistItemId) {
      const item = await prisma.checklistItem.findFirst({
        where: { id: data.checklistItemId, packageId: assignment.packageId },
        select: { id: true },
      })
      if (!item) {
        return NextResponse.json(
          { error: 'checklistItemId must belong to the same permit package as the review assignment' },
          { status: 400 }
        )
      }
    }

    const comment = await prisma.reviewComment.create({
      data: {
        assignmentId: params.id,
        authorId: session.user.id,
        body: data.body,
        checklistItemId: data.checklistItemId,
        documentId: data.documentId,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        permitPackageId: assignment.packageId,
        userId: session.user.id,
        activityType: 'CommentAdded',
        description: `Review comment added`,
        metadata: JSON.stringify({ assignmentId: params.id, commentId: comment.id }),
      },
    })

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('POST /api/review-assignments/[id]/comments:', error)
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
  }
}
