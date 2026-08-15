/**
 * Jurisdictions API — GET single / PATCH / DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { jurisdictionUpdateSchema } from '@/lib/validations'

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { id: params.id },
      include: {
        requirements: {
          where: { isActive: true },
          orderBy: [{ permitTypes: 'asc' }, { order: 'asc' }],
        },
        exportProfiles: true,
        _count: { select: { packages: true } },
      },
    })

    if (!jurisdiction)
      return NextResponse.json({ error: 'Jurisdiction not found' }, { status: 404 })

    return NextResponse.json({ data: jurisdiction })
  } catch (error) {
    console.error('GET /api/jurisdictions/[id]:', error)
    return NextResponse.json({ error: 'Failed to fetch jurisdiction' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'update', 'jurisdiction')

    const body = await request.json()
    const data = jurisdictionUpdateSchema.parse(body)

    const jurisdiction = await prisma.jurisdiction.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ data: jurisdiction })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('PATCH /api/jurisdictions/[id]:', error)
    return NextResponse.json({ error: 'Failed to update jurisdiction' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'delete', 'jurisdiction')

    // Soft-delete only. Hard delete CASCADE-wipes Requirements and their
    // RequirementChangeLog audit trail (seed history / restore snapshots).
    const jurisdiction = await prisma.jurisdiction.update({
      where: { id: params.id },
      data: { isActive: false },
    })
    return NextResponse.json({ data: jurisdiction, softDeleted: true })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('DELETE /api/jurisdictions/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete jurisdiction' }, { status: 500 })
  }
}
