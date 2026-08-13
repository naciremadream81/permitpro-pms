/**
 * POST /api/requirements/[id]/restore
 * Body: { changeLogId: string }
 *
 * Restores a requirement to the state captured in a specific change log snapshot.
 * Admin-only for full restore; coordinators/reviewers get read-only history.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { DocumentCategory } from '@/lib/generated/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

    const body = await request.json()
    const { changeLogId } = body

    if (!changeLogId)
      return NextResponse.json({ error: 'changeLogId is required' }, { status: 400 })

    // Load the snapshot
    const log = await prisma.requirementChangeLog.findUnique({
      where: { id: changeLogId },
    })
    if (!log || log.requirementId !== (await params).id)
      return NextResponse.json({ error: 'Change log entry not found' }, { status: 404 })

    let snapshot: Record<string, unknown>
    try {
      snapshot = JSON.parse(log.snapshot)
    } catch {
      return NextResponse.json({ error: 'Invalid snapshot data' }, { status: 422 })
    }

    // Get current state before overwriting (for the new log entry)
    const current = await prisma.requirement.findUnique({
      where: { id: (await params).id },
    })
    if (!current) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 })

    // Restore — only restore editable fields, never id/createdAt/jurisdictionId
    const restored = await prisma.requirement.update({
      where: { id: (await params).id },
      data: {
        documentName:            snapshot.documentName as string,
        documentCategory:        snapshot.documentCategory as DocumentCategory,
        permitTypes:             snapshot.permitTypes as string,
        isRequired:              snapshot.isRequired as boolean,
        isMandatoryForSubmission: snapshot.isMandatoryForSubmission as boolean,
        description:             snapshot.description as string | null,
        helpText:                snapshot.helpText as string | null,
        order:                   snapshot.order as number,
        isActive:                snapshot.isActive as boolean,
      },
    })

    // Log the restore action
    await prisma.requirementChangeLog.create({
      data: {
        requirementId: (await params).id,
        changedBy:     session.user.id as string,
        action:        'RESTORED',
        fieldName:     null,
        oldValue:      JSON.stringify(current),
        newValue:      JSON.stringify(restored),
        snapshot:      JSON.stringify(restored),
      },
    })

    return NextResponse.json({ data: restored })
  } catch (error) {
    console.error('POST /api/requirements/[id]/restore:', error)
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 })
  }
}
