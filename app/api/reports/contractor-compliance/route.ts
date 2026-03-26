/**
 * Contractor Compliance Report API
 *
 * Returns all contractors with their document vault status,
 * expiry timeline, and count of active packages at risk.
 */

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contractors = await prisma.contractor.findMany({
      include: {
        contractorDocuments: {
          where: { isSuperseded: false },
          select: {
            type: true,
            expirationDate: true,
            isVerified: true,
            status: true,
          },
        },
        _count: {
          select: {
            permitPackages: true,
          },
        },
        permitPackages: {
          where: { status: { notIn: ['FinaledClosed', 'Canceled'] } },
          select: { id: true },
        },
      },
      orderBy: { companyName: 'asc' },
    })

    const now = new Date()
    const WARN_DAYS = 30

    const rows = contractors.map((c) => {
      const docs = c.contractorDocuments

      function expiryInfo(type: string) {
        const doc = docs.find((d) => d.type === type)
        if (!doc?.expirationDate) return { status: 'missing' as const, daysLeft: null }
        const days = Math.floor((doc.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          status: days < 0 ? 'expired' as const : days <= WARN_DAYS ? 'expiring' as const : 'valid' as const,
          daysLeft: days,
          expirationDate: doc.expirationDate.toISOString(),
          isVerified: doc.isVerified,
        }
      }

      const license = expiryInfo('LICENSE')
      const workersComp = expiryInfo('WORKERS_COMP')
      const liability = expiryInfo('LIABILITY')
      const w9 = expiryInfo('W9')

      const allStatuses = [license.status, workersComp.status, liability.status]
      const overallStatus = allStatuses.includes('expired')
        ? 'expired'
        : allStatuses.includes('expiring')
        ? 'expiring'
        : allStatuses.includes('missing')
        ? 'incomplete'
        : 'compliant'

      return {
        id: c.id,
        companyName: c.companyName,
        licenseNumber: c.licenseNumber,
        email: c.email,
        phone: c.phone,
        totalPackages: c._count.permitPackages,
        activePackages: c.permitPackages.length,
        overallStatus,
        documents: { license, workersComp, liability, w9 },
      }
    })

    // Sort: expired first, then expiring, then incomplete, then compliant
    const order = { expired: 0, expiring: 1, incomplete: 2, compliant: 3 }
    rows.sort((a, b) => (order[a.overallStatus as keyof typeof order] ?? 3) - (order[b.overallStatus as keyof typeof order] ?? 3))

    return NextResponse.json({ data: rows, total: rows.length })
  } catch (error) {
    console.error('GET /api/reports/contractor-compliance:', error)
    return NextResponse.json({ error: 'Failed to generate compliance report' }, { status: 500 })
  }
}
