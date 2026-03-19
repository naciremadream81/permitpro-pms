/**
 * Submission Volume Report API
 *
 * Returns monthly permit submission counts bucketed by permit type,
 * plus totals for the trailing 12 months.
 * Useful for spotting seasonal load and planning staffing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Trailing 12 months
    const since = new Date()
    since.setFullYear(since.getFullYear() - 1)
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const packages = await prisma.permitPackage.findMany({
      where: { openedDate: { gte: since } },
      select: {
        permitType: true,
        openedDate: true,
        status: true,
        jurisdiction: { select: { name: true } },
      },
      orderBy: { openedDate: 'asc' },
    })

    // Build month buckets: { "2025-03": { total, byType: {}, approved, closed } }
    const buckets = new Map<string, { month: string; total: number; approved: number; closed: number; byType: Record<string, number> }>()

    for (const pkg of packages) {
      const d = pkg.openedDate
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!buckets.has(key)) {
        buckets.set(key, { month: key, total: 0, approved: 0, closed: 0, byType: {} })
      }
      const b = buckets.get(key)!
      b.total++
      b.byType[pkg.permitType] = (b.byType[pkg.permitType] ?? 0) + 1
      if (pkg.status === 'Approved' || pkg.status === 'Issued') b.approved++
      if (pkg.status === 'FinaledClosed') b.closed++
    }

    // Ensure all 12 months appear in order even if empty
    const months: string[] = []
    const cursor = new Date(since)
    while (cursor <= new Date()) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
      if (!months.includes(key)) {
        months.push(key)
        if (!buckets.has(key)) {
          buckets.set(key, { month: key, total: 0, approved: 0, closed: 0, byType: {} })
        }
      }
      cursor.setMonth(cursor.getMonth() + 1)
    }
    months.sort()

    const rows = months.map(m => buckets.get(m)!)

    // Aggregate by jurisdiction (top 10)
    const byJurisdiction = new Map<string, number>()
    for (const pkg of packages) {
      const jx = pkg.jurisdiction?.name ?? 'Unknown'
      byJurisdiction.set(jx, (byJurisdiction.get(jx) ?? 0) + 1)
    }
    const topJurisdictions = Array.from(byJurisdiction.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // All permit types seen
    const permitTypes = Array.from(new Set(packages.map(p => p.permitType))).sort()

    return NextResponse.json({
      data: rows,
      total: packages.length,
      permitTypes,
      topJurisdictions,
    })
  } catch (error) {
    console.error('GET /api/reports/submission-volume:', error)
    return NextResponse.json({ error: 'Failed to generate submission volume report' }, { status: 500 })
  }
}
