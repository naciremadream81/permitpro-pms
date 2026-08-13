/**
 * PATCH /api/admin/permit-types/[id]   — update label/description/isActive
 * DELETE /api/admin/permit-types/[id]  — deactivate (soft delete, admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updatePermitTypeSchema = z.object({
  label: z.string().trim().min(1, 'label is required').max(120, 'label is too long').optional(),
  description: z.string().trim().max(1000, 'description is too long').nullable().optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required',
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const parsed = updatePermitTypeSchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 })

    const { label, description, isActive } = parsed.data

    const updated = await prisma.permitTypeDefinition.update({
      where: { id: (await params).id },
      data: {
        ...(label !== undefined       ? { label }       : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isActive !== undefined    ? { isActive }    : {}),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('PATCH /api/admin/permit-types/[id]:', error)
    return NextResponse.json({ error: 'Failed to update permit type' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const type = await prisma.permitTypeDefinition.findUnique({ where: { id: (await params).id } })
    if (!type) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (type.isBuiltIn)
      return NextResponse.json({ error: 'Built-in permit types cannot be deleted' }, { status: 422 })

    // Soft-delete: deactivate rather than destroy
    const updated = await prisma.permitTypeDefinition.update({
      where: { id: (await params).id },
      data: { isActive: false },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('DELETE /api/admin/permit-types/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete permit type' }, { status: 500 })
  }
}
