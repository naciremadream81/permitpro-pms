/**
 * Review Queue API
 *
 * Returns all review assignments visible to the current user.
 * - Reviewers see only their own assignments
 * - Admins/coordinators see all assignments
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = normalizeRole(session.user?.role)
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }

    // Reviewers only see their own queue
    if (role === 'reviewer') {
      where.reviewerId = session.user.id
    }

    const assignments = await prisma.reviewAssignment.findMany({
      where,
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
        comments: { select: { id: true, isResolved: true } },
        package: {
          select: {
            id: true,
            projectName: true,
            projectAddress: true,
            permitType: true,
            county: true,
            jurisdiction: { select: { name: true } },
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { assignedAt: 'asc' },
      ],
    })

    return NextResponse.json({ data: assignments })
  } catch (error) {
    console.error('GET /api/review-queue:', error)
    return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 })
  }
}
