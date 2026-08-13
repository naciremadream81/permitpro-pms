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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const comments = await prisma.reviewComment.findMany({
      where: { assignmentId: (await params).id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'read', 'review') // any authenticated user with review access

    const assignment = await prisma.reviewAssignment.findUnique({
      where: { id: (await params).id },
    })
    if (!assignment)
      return NextResponse.json({ error: 'Review assignment not found' }, { status: 404 })

    const body = await request.json()
    const data = reviewCommentSchema.parse(body)

    const comment = await prisma.reviewComment.create({
      data: {
        assignmentId: (await params).id,
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
        metadata: JSON.stringify({ assignmentId: (await params).id, commentId: comment.id }),
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
