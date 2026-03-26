/**
 * Package Pipeline Report API
 *
 * Returns all active packages enriched with operational metrics:
 * age in current stage, checklist completion, contractor compliance status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = request.nextUrl
    const coordinatorId = searchParams.get('coordinatorId')
    const jurisdictionId = searchParams.get('jurisdictionId')
    const permitType = searchParams.get('permitType')
    const stage = searchParams.get('stage')

    const where: Record<string, unknown> = {
      status: { notIn: ['FinaledClosed', 'Canceled'] },
    }
    if (coordinatorId) where.coordinatorId = coordinatorId
    if (jurisdictionId) where.jurisdictionId = jurisdictionId
    if (permitType) where.permitType = permitType
    if (stage) where.internalStage = stage

    const packages = await prisma.permitPackage.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        contractor: {
          select: {
            companyName: true,
            workersCompExpirationDate: true,
            liabilityExpirationDate: true,
            contractorDocuments: {
              where: { isSuperseded: false },
              select: { type: true, expirationDate: true, status: true },
            },
          },
        },
        coordinator: { select: { name: true } },
        jurisdiction: { select: { name: true } },
        checklistItems: {
          select: {
            status: true,
            requirement: { select: { isRequired: true, isMandatoryForSubmission: true } },
          },
        },
        reviewAssignments: {
          where: { status: { in: ['ASSIGNED', 'IN_REVIEW'] } },
          select: { reviewerId: true, assignedAt: true, dueDate: true },
          orderBy: { assignedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastActivityAt: 'asc' }, // longest-idle first
    })

    const now = new Date()

    const rows = packages.map((pkg) => {
      // Checklist completion
      const mandatory = pkg.checklistItems.filter((i) => i.requirement.isMandatoryForSubmission)
      const done = mandatory.filter((i) =>
        i.status === 'VERIFIED' || i.status === 'WAIVED' || i.status === 'NOT_APPLICABLE'
      )
      const checklistPct = mandatory.length === 0 ? 100 : Math.round((done.length / mandatory.length) * 100)

      // Days since last activity
      const lastActivity = pkg.lastActivityAt ?? pkg.openedDate
      const daysIdle = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))

      // Contractor compliance
      const docs = pkg.contractor.contractorDocuments
      const licenseExpiry = docs.find((d) => d.type === 'LICENSE')?.expirationDate
        ?? null
      const insuranceExpiry = docs.find((d) => d.type === 'LIABILITY')?.expirationDate
        ?? pkg.contractor.liabilityExpirationDate
        ?? null

      let contractorStatus: 'ok' | 'expiring' | 'expired' = 'ok'
      for (const expiry of [licenseExpiry, insuranceExpiry]) {
        if (!expiry) continue
        const days = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (days < 0) { contractorStatus = 'expired'; break }
        if (days <= 30) contractorStatus = 'expiring'
      }

      return {
        id: pkg.id,
        projectName: pkg.projectName,
        projectAddress: pkg.projectAddress,
        permitType: pkg.permitType,
        status: pkg.status,
        internalStage: pkg.internalStage,
        jurisdiction: pkg.jurisdiction?.name ?? pkg.county ?? null,
        customer: pkg.customer.name,
        contractor: pkg.contractor.companyName,
        coordinator: pkg.coordinator?.name ?? null,
        openedDate: pkg.openedDate.toISOString(),
        targetIssueDate: pkg.targetIssueDate?.toISOString() ?? null,
        lastActivityAt: lastActivity.toISOString(),
        daysIdle,
        checklistPct,
        checklistTotal: mandatory.length,
        checklistDone: done.length,
        contractorStatus,
        inReview: pkg.reviewAssignments.length > 0,
      }
    })

    return NextResponse.json({ data: rows, total: rows.length })
  } catch (error) {
    console.error('GET /api/reports/pipeline:', error)
    return NextResponse.json({ error: 'Failed to generate pipeline report' }, { status: 500 })
  }
}
