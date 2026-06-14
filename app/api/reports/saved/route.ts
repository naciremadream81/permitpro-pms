/**
 * Saved Reports API — GET list / POST create
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const savedReportSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  isShared: z.boolean().default(false),
  reportType: z.enum([
    'PACKAGE_PIPELINE',
    'STALLED_PACKAGES',
    'CONTRACTOR_COMPLIANCE',
    'DOCUMENT_QUALITY',
    'REVIEW_PERFORMANCE',
    'SUBMISSION_VOLUME',
  ]),
  filters: z.string().default('{}'),
  columns: z.string().default('[]'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reports = await prisma.savedReport.findMany({
      where: {
        OR: [
          { createdBy: session.user.id },
          { isShared: true },
        ],
      },
      orderBy: [{ isShared: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ data: reports })
  } catch (error) {
    console.error('GET /api/reports/saved:', error)
    return NextResponse.json({ error: 'Failed to fetch saved reports' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const data = savedReportSchema.parse(body)

    const report = await prisma.savedReport.create({
      data: { ...data, createdBy: session.user.id },
    })

    return NextResponse.json({ data: report }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('POST /api/reports/saved:', error)
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 })
  }
}
