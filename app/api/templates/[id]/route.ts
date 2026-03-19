/**
 * Document Templates API — GET single / PATCH / DELETE (archive)
 *
 * GET    /api/templates/:id
 * PATCH  /api/templates/:id   (admin only — code is immutable after creation)
 * DELETE /api/templates/:id   (admin only — soft-archives; hard-delete only when DRAFT)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

type Params = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  category:    z.enum([
    'Application', 'Plans', 'Specifications', 'Structural',
    'Electrical', 'Mechanical', 'Correspondence', 'Permit',
    'Inspection', 'Certificate', 'Other',
  ] as const).optional(),
  content:     z.string().min(1).optional(),
  mergeFields: z.string().optional(),
  status:      z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
})

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const template = await prisma.documentTemplate.findUnique({ where: { id } })
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: template })
  } catch (error) {
    console.error('GET /api/templates/[id]:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { id } = await params
    const template = await prisma.documentTemplate.findUnique({ where: { id } })
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body  = await request.json()
    const patch = patchSchema.parse(body)

    // When activating, bump version if content changed
    const bumpVersion =
      patch.status === 'ACTIVE' &&
      template.status !== 'ACTIVE' &&
      patch.content &&
      patch.content !== template.content

    const updated = await prisma.documentTemplate.update({
      where: { id },
      data: {
        ...patch,
        ...(bumpVersion ? { version: { increment: 1 } } : {}),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Validation error', details: error.flatten() }, { status: 400 })
    console.error('PATCH /api/templates/[id]:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.role !== 'admin')
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const { id } = await params
    const template = await prisma.documentTemplate.findUnique({ where: { id } })
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (template.status === 'DRAFT') {
      // Hard-delete drafts — they've never been used
      await prisma.documentTemplate.delete({ where: { id } })
    } else {
      // Soft-archive active / previously active templates
      await prisma.documentTemplate.update({
        where: { id },
        data:  { status: 'ARCHIVED' },
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('DELETE /api/templates/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
