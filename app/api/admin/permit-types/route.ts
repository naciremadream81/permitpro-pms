/**
 * GET  /api/admin/permit-types   — list all permit type definitions
 * POST /api/admin/permit-types   — create a new custom permit type
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createPermitTypeSchema = z.object({
  code: z.string().trim().min(1, 'code is required').max(64, 'code is too long'),
  label: z.string().trim().min(1, 'label is required').max(120, 'label is too long'),
  description: z.string().trim().max(1000, 'description is too long').optional().nullable(),
})

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const types = await prisma.permitTypeDefinition.findMany({
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    })

    // Seed built-in types if table is empty
    if (types.length === 0) {
      return NextResponse.json({ data: [] })
    }

    return NextResponse.json({ data: types })
  } catch (error) {
    console.error('GET /api/admin/permit-types:', error)
    return NextResponse.json({ error: 'Failed to fetch permit types' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const parsed = createPermitTypeSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 })

    const { code, label, description } = parsed.data

    // Slugify code
    const slug = code.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
    if (!slug)
      return NextResponse.json({ error: 'code must contain at least one letter, number, or underscore' }, { status: 400 })

    const existing = await prisma.permitTypeDefinition.findUnique({ where: { code: slug } })
    if (existing)
      return NextResponse.json({ error: 'A permit type with this code already exists' }, { status: 409 })

    const maxOrder = await prisma.permitTypeDefinition.aggregate({ _max: { order: true } })

    const created = await prisma.permitTypeDefinition.create({
      data: {
        code: slug,
        label,
        description: description || null,
        isBuiltIn: false,
        isActive: true,
        order: (maxOrder._max.order ?? 0) + 1,
        createdBy: session.user?.id as string,
      },
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/permit-types:', error)
    return NextResponse.json({ error: 'Failed to create permit type' }, { status: 500 })
  }
}
