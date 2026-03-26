/**
 * Export Profiles API — GET list / POST create
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { exportProfileSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const jurisdictionId = request.nextUrl.searchParams.get('jurisdictionId')

    const profiles = await prisma.exportProfile.findMany({
      where: jurisdictionId ? { OR: [{ jurisdictionId }, { jurisdictionId: null }] } : {},
      include: {
        jurisdiction: { select: { id: true, name: true } },
        _count: { select: { exportLogs: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ data: profiles })
  } catch (error) {
    console.error('GET /api/export-profiles:', error)
    return NextResponse.json({ error: 'Failed to fetch export profiles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'create', 'export_profile')

    const body = await request.json()
    const data = exportProfileSchema.parse(body)

    // If setting as default for a jurisdiction, unset others
    if (data.isDefault) {
      await prisma.exportProfile.updateMany({
        where: {
          jurisdictionId: data.jurisdictionId ?? null,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    const profile = await prisma.exportProfile.create({ data })
    return NextResponse.json({ data: profile }, { status: 201 })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('POST /api/export-profiles:', error)
    return NextResponse.json({ error: 'Failed to create export profile' }, { status: 500 })
  }
}
