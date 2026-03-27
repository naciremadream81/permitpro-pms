/**
 * GET /api/requirements/[id]/history
 * Returns the full change log for a requirement, ordered newest-first.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const logs = await prisma.requirementChangeLog.findMany({
      where: { requirementId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        seedBatch: {
          select: { id: true, description: true, startedAt: true },
        },
      },
    })

    return NextResponse.json({ data: logs })
  } catch (error) {
    console.error('GET /api/requirements/[id]/history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
