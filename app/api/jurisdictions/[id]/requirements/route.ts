/**
 * Jurisdiction Requirements API — GET list / POST create
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { requirementSchema } from '@/lib/validations'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const requirements = await prisma.requirement.findMany({
      where: { jurisdictionId: params.id },
      orderBy: [{ permitTypes: 'asc' }, { order: 'asc' }],
    })

    return NextResponse.json({ data: requirements })
  } catch (error) {
    console.error('GET /api/jurisdictions/[id]/requirements:', error)
    return NextResponse.json({ error: 'Failed to fetch requirements' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'create', 'requirement')

    // Verify jurisdiction exists
    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { id: params.id },
    })
    if (!jurisdiction)
      return NextResponse.json({ error: 'Jurisdiction not found' }, { status: 404 })

    const body = await request.json()
    const data = requirementSchema.parse({ ...body, jurisdictionId: params.id })

    const requirement = await prisma.requirement.create({ data })

    return NextResponse.json({ data: requirement }, { status: 201 })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('POST /api/jurisdictions/[id]/requirements:', error)
    return NextResponse.json({ error: 'Failed to create requirement' }, { status: 500 })
  }
}
