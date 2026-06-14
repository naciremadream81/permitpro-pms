/**
 * Stalled Packages Report API
 *
 * Returns packages with no activity for more than N days.
 * Default threshold: 3 days (configurable via `?days=N`).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const stallDays = parseInt(request.nextUrl.searchParams.get('days') ?? '3')
    const threshold = new Date(Date.now() - stallDays * 24 * 60 * 60 * 1000)

    const packages = await prisma.permitPackage.findMany({
      where: {
        status: { notIn: ['FinaledClosed', 'Canceled', 'Approved'] },
        OR: [
          { lastActivityAt: { lt: threshold } },
          { lastActivityAt: null, openedDate: { lt: threshold } },
        ],
      },
      include: {
        customer: { select: { name: true } },
        contractor: { select: { companyName: true } },
        coordinator: { select: { name: true } },
        jurisdiction: { select: { name: true } },
      },
      orderBy: { lastActivityAt: 'asc' },
    })

    const now = new Date()
    const rows = packages.map((pkg) => {
      const last = pkg.lastActivityAt ?? pkg.openedDate
      const daysIdle = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: pkg.id,
        projectName: pkg.projectName,
        permitType: pkg.permitType,
        status: pkg.status,
        internalStage: pkg.internalStage,
        jurisdiction: pkg.jurisdiction?.name ?? pkg.county ?? null,
        customer: pkg.customer.name,
        contractor: pkg.contractor.companyName,
        coordinator: pkg.coordinator?.name ?? null,
        lastActivityAt: last.toISOString(),
        daysIdle,
      }
    })

    return NextResponse.json({ data: rows, total: rows.length, stallDays })
  } catch (error) {
    console.error('GET /api/reports/stalled:', error)
    return NextResponse.json({ error: 'Failed to generate stalled report' }, { status: 500 })
  }
}
