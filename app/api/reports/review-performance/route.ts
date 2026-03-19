/**
 * Review Performance Report API
 *
 * Returns per-reviewer metrics: avg review time, approval rate,
 * send-back rate, SLA compliance.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const assignments = await prisma.reviewAssignment.findMany({
      where: { status: { in: ['APPROVED', 'SENT_BACK'] } },
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
        comments: { select: { id: true } },
      },
      orderBy: { completedAt: 'desc' },
    })

    // Group by reviewer
    const byReviewer = new Map<
      string,
      {
        reviewer: { id: string; name: string; email: string }
        assignments: typeof assignments
      }
    >()

    for (const a of assignments) {
      const key = a.reviewerId
      if (!byReviewer.has(key)) {
        byReviewer.set(key, { reviewer: a.reviewer, assignments: [] })
      }
      byReviewer.get(key)!.assignments.push(a)
    }

    const rows = Array.from(byReviewer.values()).map(({ reviewer, assignments: ras }) => {
      const completed = ras.filter((a) => a.completedAt && a.startedAt)
      const totalMs = completed.reduce((sum, a) => {
        return sum + (a.completedAt!.getTime() - a.startedAt!.getTime())
      }, 0)
      const avgReviewHours = completed.length > 0
        ? Math.round(totalMs / completed.length / (1000 * 60 * 60) * 10) / 10
        : null

      const approved = ras.filter((a) => a.status === 'APPROVED').length
      const sentBack = ras.filter((a) => a.status === 'SENT_BACK').length
      const total = ras.length

      const slaCompliant = ras.filter((a) => {
        if (!a.dueDate || !a.completedAt) return false
        return a.completedAt <= a.dueDate
      }).length
      const withDueDate = ras.filter((a) => a.dueDate && a.completedAt).length
      const slaRate = withDueDate > 0 ? Math.round((slaCompliant / withDueDate) * 100) : null

      const totalComments = ras.reduce((sum, a) => sum + a.comments.length, 0)
      const avgCommentsPerReview = total > 0 ? Math.round((totalComments / total) * 10) / 10 : 0

      return {
        reviewer,
        total,
        approved,
        sentBack,
        approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
        sendBackRate: total > 0 ? Math.round((sentBack / total) * 100) : 0,
        avgReviewHours,
        slaComplianceRate: slaRate,
        avgCommentsPerReview,
      }
    })

    rows.sort((a, b) => b.total - a.total)

    return NextResponse.json({ data: rows, total: rows.length })
  } catch (error) {
    console.error('GET /api/reports/review-performance:', error)
    return NextResponse.json({ error: 'Failed to generate review performance report' }, { status: 500 })
  }
}
