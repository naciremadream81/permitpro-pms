/**
 * Saved Reports API — GET single / DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { ForbiddenError, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { handleApiError, requirePermission } from '@/lib/api-security'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requirePermission(session, 'read', 'saved_report')

    const { id } = await params
    const report = await prisma.savedReport.findFirst({
      where: {
        id,
        OR: [{ createdBy: session.user.id }, { isShared: true }],
      },
    })

    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: report })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch report', { notFoundMessage: 'Report not found' })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requirePermission(session, 'delete', 'saved_report')

    const { id } = await params

    const report = await prisma.savedReport.findUnique({ where: { id } })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = normalizeRole(session.user.role) === 'admin'
    if (report.createdBy !== session.user.id && !isAdmin) {
      throw new ForbiddenError('Only the report creator or an admin can delete this report')
    }

    await prisma.savedReport.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'Failed to delete report', { notFoundMessage: 'Report not found' })
  }
}
