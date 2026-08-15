/**
 * PATCH /api/admin/permit-types/[id]   — update label/description/isActive
 * DELETE /api/admin/permit-types/[id]  — deactivate (soft delete, admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { label, description, isActive } = body

    const updated = await prisma.permitTypeDefinition.update({
      where: { id: params.id },
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

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const type = await prisma.permitTypeDefinition.findUnique({ where: { id: params.id } })
    if (!type) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (type.isBuiltIn)
      return NextResponse.json({ error: 'Built-in permit types cannot be deleted' }, { status: 422 })

    // Soft-delete: deactivate rather than destroy
    const updated = await prisma.permitTypeDefinition.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('DELETE /api/admin/permit-types/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete permit type' }, { status: 500 })
  }
}
