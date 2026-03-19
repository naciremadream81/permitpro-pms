/**
 * Requirement API — PATCH / DELETE individual requirement
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { requirementUpdateSchema } from '@/lib/validations'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'update', 'requirement')

    const body = await request.json()
    const data = requirementUpdateSchema.parse(body)

    const requirement = await prisma.requirement.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ data: requirement })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('PATCH /api/requirements/[id]:', error)
    return NextResponse.json({ error: 'Failed to update requirement' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'delete', 'requirement')

    // Soft-delete: mark inactive rather than destroy if checklist items exist
    const checklistCount = await prisma.checklistItem.count({
      where: { requirementId: params.id },
    })

    if (checklistCount > 0) {
      const requirement = await prisma.requirement.update({
        where: { id: params.id },
        data: { isActive: false },
      })
      return NextResponse.json({ data: requirement, softDeleted: true })
    }

    await prisma.requirement.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('DELETE /api/requirements/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete requirement' }, { status: 500 })
  }
}
