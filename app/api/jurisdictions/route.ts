/**
 * Jurisdictions API — GET list / POST create
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { jurisdictionSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = request.nextUrl
    const state = searchParams.get('state')
    const isActive = searchParams.get('isActive')

    const jurisdictions = await prisma.jurisdiction.findMany({
      where: {
        ...(state ? { state } : {}),
        ...(isActive !== null ? { isActive: isActive !== 'false' } : {}),
      },
      include: {
        _count: {
          select: { requirements: true, packages: true },
        },
      },
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ data: jurisdictions })
  } catch (error) {
    console.error('GET /api/jurisdictions:', error)
    return NextResponse.json({ error: 'Failed to fetch jurisdictions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    enforce(normalizeRole(session.user?.role), 'create', 'jurisdiction')

    const body = await request.json()
    const data = jurisdictionSchema.parse(body)

    const jurisdiction = await prisma.jurisdiction.create({ data })

    return NextResponse.json({ data: jurisdiction }, { status: 201 })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('POST /api/jurisdictions:', error)
    return NextResponse.json({ error: 'Failed to create jurisdiction' }, { status: 500 })
  }
}
