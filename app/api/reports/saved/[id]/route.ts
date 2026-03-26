/**
 * Saved Reports API — GET single / PATCH / DELETE
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    console.error('GET /api/reports/saved/[id]:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    // Only the creator or an admin can delete
    const report = await prisma.savedReport.findUnique({ where: { id } })
    if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isAdmin = session.user.role === 'admin'
    if (report.createdBy !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.savedReport.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('DELETE /api/reports/saved/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 })
  }
}
