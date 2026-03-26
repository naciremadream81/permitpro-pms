/**
 * Jurisdictions API — GET single / PATCH / DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { jurisdictionUpdateSchema } from '@/lib/validations'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'delete', 'jurisdiction')

    // Prevent deletion if packages are linked
    const packageCount = await prisma.permitPackage.count({
      where: { jurisdictionId: params.id },
    })
    if (packageCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${packageCount} package(s) reference this jurisdiction. Deactivate it instead.` },
        { status: 409 }
      )
    }

    await prisma.jurisdiction.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('DELETE /api/jurisdictions/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete jurisdiction' }, { status: 500 })
  }
}
