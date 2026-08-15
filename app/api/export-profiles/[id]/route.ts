/**
 * Export Profile API — GET / PATCH / DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { exportProfileUpdateSchema } from '@/lib/validations'

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.exportProfile.findUnique({
      where: { id: params.id },
      include: {
        jurisdiction: { select: { id: true, name: true } },
        exportLogs: {
          orderBy: { exportedAt: 'desc' },
          take: 10,
          include: {
            package: { select: { id: true, projectName: true } },
          },
        },
      },
    })

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    return NextResponse.json({ data: profile })
  } catch (error) {
    console.error('GET /api/export-profiles/[id]:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'update', 'export_profile')

    const body = await request.json()
    const data = exportProfileUpdateSchema.parse(body)

    const current = await prisma.exportProfile.findUnique({ where: { id: params.id } })
    if (!current) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    if (data.isDefault) {
      await prisma.exportProfile.updateMany({
        where: { jurisdictionId: { equals: current.jurisdictionId ?? null }, isDefault: true, id: { not: params.id } },
        data: { isDefault: false },
      })
    }

    const profile = await prisma.exportProfile.update({ where: { id: params.id }, data })
    return NextResponse.json({ data: profile })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('PATCH /api/export-profiles/[id]:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'delete', 'export_profile')

    await prisma.exportProfile.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('DELETE /api/export-profiles/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
  }
}
