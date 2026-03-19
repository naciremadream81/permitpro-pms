/**
 * Document Quality Report API
 *
 * Per-document-category quality breakdown: rejection rate, revision depth
 * (number of child versions in a version group), and verification rates.
 * Helps identify document categories that generate the most re-work.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const documents = await prisma.permitDocument.findMany({
      select: {
        category: true,
        status: true,
        parentDocumentId: true,
        versionGroupId: true,
        uploadedAt: true,
        isVerified: true,
      },
    })

    // Count revisions per versionGroup (number of docs sharing same versionGroupId)
    const versionGroupSizes = new Map<string, number>()
    for (const doc of documents) {
      if (doc.versionGroupId) {
        versionGroupSizes.set(doc.versionGroupId, (versionGroupSizes.get(doc.versionGroupId) ?? 0) + 1)
      }
    }

    // Group by category
    const byCategory = new Map<
      string,
      {
        total: number
        verified: number
        rejected: number
        pending: number
        revised: number   // docs that are revisions (have a parent)
        versionDepths: number[]  // sizes of version groups this doc belongs to
      }
    >()

    for (const doc of documents) {
      const key = doc.category
      if (!byCategory.has(key)) {
        byCategory.set(key, { total: 0, verified: 0, rejected: 0, pending: 0, revised: 0, versionDepths: [] })
      }
      const g = byCategory.get(key)!
      g.total++
      if (doc.status === 'Verified' || doc.isVerified) g.verified++
      else if (doc.status === 'Rejected') g.rejected++
      else g.pending++

      if (doc.parentDocumentId) g.revised++
      if (doc.versionGroupId) {
        const depth = versionGroupSizes.get(doc.versionGroupId) ?? 1
        g.versionDepths.push(depth)
      }
    }

    const rows = Array.from(byCategory.entries()).map(([category, g]) => {
      const rejectionRate = g.total > 0 ? Math.round(((g.rejected + g.revised) / g.total) * 100) : 0
      const verificationRate = g.total > 0 ? Math.round((g.verified / g.total) * 100) : 0
      const avgVersionDepth = g.versionDepths.length > 0
        ? Math.round(g.versionDepths.reduce((s, v) => s + v, 0) / g.versionDepths.length * 10) / 10
        : null

      return {
        category,
        total: g.total,
        verified: g.verified,
        rejected: g.rejected,
        pending: g.pending,
        revised: g.revised,
        verificationRate,
        rejectionRate,
        avgVersionDepth,
      }
    })

    // Sort by rejection rate desc (most problematic first)
    rows.sort((a, b) => b.rejectionRate - a.rejectionRate)

    return NextResponse.json({ data: rows, total: rows.length })
  } catch (error) {
    console.error('GET /api/reports/document-quality:', error)
    return NextResponse.json({ error: 'Failed to generate document quality report' }, { status: 500 })
  }
}
