/**
 * Package Readiness API — GET evaluation result
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { evaluateReadiness } from '@/lib/readiness-engine'

// GET /api/permits/[id]/readiness — evaluate readiness without triggering a transition
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permit = await prisma.permitPackage.findUnique({ where: { id: params.id } })
    if (!permit) return NextResponse.json({ error: 'Permit not found' }, { status: 404 })

    const result = await evaluateReadiness(params.id)

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('GET /api/permits/[id]/readiness:', error)
    return NextResponse.json({ error: 'Failed to evaluate readiness' }, { status: 500 })
  }
}
