/**
 * Review Comment API — PATCH (resolve / unresolve)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { reviewCommentUpdateSchema } from '@/lib/validations'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'resolve_comment', 'review')

    const body = await request.json()
    const { isResolved } = reviewCommentUpdateSchema.parse(body)

    const comment = await prisma.reviewComment.update({
      where: { id: params.id },
      data: {
        isResolved,
        resolvedBy: isResolved ? session.user.id : null,
        resolvedAt: isResolved ? new Date() : null,
      },
      include: {
        assignment: { select: { packageId: true } },
      },
    })

    await prisma.activityLog.create({
      data: {
        permitPackageId: comment.assignment.packageId,
        userId: session.user.id,
        activityType: 'CommentResolved',
        description: `Review comment ${isResolved ? 'resolved' : 'reopened'}`,
        metadata: JSON.stringify({ commentId: params.id }),
      },
    })

    await prisma.permitPackage.update({
      where: { id: comment.assignment.packageId },
      data: { lastActivityAt: new Date() },
    })

    return NextResponse.json({ data: comment })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('PATCH /api/review-comments/[id]:', error)
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 })
  }
}
