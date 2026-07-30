/**
 * Export Profiles API — GET list / POST create
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { exportProfileSchema } from '@/lib/validations'
import { handleApiError, requirePermission } from '@/lib/api-security'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requirePermission(session, 'read', 'export_profile')

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
    return handleApiError(error, 'Failed to fetch export profiles')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requirePermission(session, 'create', 'export_profile')

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
    return handleApiError(error, 'Failed to create export profile')
  }
}
