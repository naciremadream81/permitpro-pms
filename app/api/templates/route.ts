/**
 * Document Templates API — GET list / POST create
 *
 * GET  /api/templates?status=ACTIVE&category=Application
 * POST /api/templates  (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, digits, and underscores'),
  description: z.string().optional(),
  category: z.enum([
    'Application', 'Plans', 'Specifications', 'Structural',
    'Electrical', 'Mechanical', 'Correspondence', 'Permit',
    'Inspection', 'Certificate', 'Other',
  ] as const),
  content: z.string().min(1, 'Template content is required'),
  mergeFields: z.string().default('[]'),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status   = searchParams.get('status')   ?? undefined
    const category = searchParams.get('category') ?? undefined
    const q        = searchParams.get('q')        ?? undefined

    const templates = await prisma.documentTemplate.findMany({
      where: {
        ...(status   ? { status: status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED' } : {}),
        ...(category ? { category } : {}),
        ...(q ? {
          OR: [
            { name:        { contains: q } },
            { code:        { contains: q } },
            { description: { contains: q } },
          ],
        } : {}),
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ data: templates })
  } catch (error) {
    console.error('GET /api/templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const body = await request.json()
    const data = createSchema.parse(body)

    // Ensure code uniqueness
    const existing = await prisma.documentTemplate.findUnique({ where: { code: data.code } })
    if (existing)
      return NextResponse.json({ error: `Code "${data.code}" is already in use` }, { status: 409 })

    const template = await prisma.documentTemplate.create({
      data: { ...data, createdBy: session.user.id },
    })

    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Validation error', details: error.flatten() }, { status: 400 })
    console.error('POST /api/templates:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
