/**
 * Requirement API — PATCH / DELETE individual requirement
 * Now includes RequirementChangeLog entries on every mutation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { ChangeAction } from '@prisma/client'
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

    // Capture current state for change log
    const before = await prisma.requirement.findUnique({ where: { id: params.id } })
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const requirement = await prisma.requirement.update({
      where: { id: params.id },
      data,
    })

    // Determine action type and log each changed field
    const changedFields = Object.keys(data) as (keyof typeof data)[]
    const isToggle = changedFields.length === 1 && changedFields[0] === 'isActive'
    const action = isToggle
      ? (data.isActive ? 'ACTIVATED' : 'DEACTIVATED')
      : 'UPDATED'

    for (const field of changedFields) {
      const oldVal = before[field as keyof typeof before]
      const newVal = data[field]
      if (String(oldVal) === String(newVal)) continue
      await prisma.requirementChangeLog.create({
        data: {
          requirementId: params.id,
          changedBy: session.user?.id as string,
          action: action as ChangeAction,
          fieldName: field,
          oldValue: String(oldVal ?? ''),
          newValue: String(newVal ?? ''),
          snapshot: JSON.stringify(requirement),
        },
      })
    }

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

    const before = await prisma.requirement.findUnique({ where: { id: params.id } })
    if (!before) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Always soft-delete so RequirementChangeLog history (onDelete: Cascade) is preserved
    // and restore/history endpoints remain usable.
    const requirement = before.isActive
      ? await prisma.requirement.update({
          where: { id: params.id },
          data: { isActive: false },
        })
      : before

    if (before.isActive) {
      await prisma.requirementChangeLog.create({
        data: {
          requirementId: params.id,
          changedBy: session.user?.id as string,
          action: 'DEACTIVATED',
          fieldName: 'isActive',
          oldValue: 'true',
          newValue: 'false',
          snapshot: JSON.stringify(requirement),
        },
      })
    }

    return NextResponse.json({ data: requirement, softDeleted: true })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('DELETE /api/requirements/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete requirement' }, { status: 500 })
  }
}
