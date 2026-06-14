/**
 * Permit Submission API — POST
 *
 * "Submit to county": advances a package that has passed internal review
 * (internalStage = ReadyToSubmit) to the county-submitted state.
 * Coordinator/admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    enforce(normalizeRole(session.user?.role), 'submit_review', 'package')

    const permit = await prisma.permitPackage.findUnique({ where: { id: params.id } })
    if (!permit) return NextResponse.json({ error: 'Permit not found' }, { status: 404 })

    // Only packages that passed internal review (Ready to Submit) can be submitted.
    if (permit.internalStage !== 'ReadyToSubmit') {
      return NextResponse.json(
        { error: 'Package is not ready to submit — it must pass review first' },
        { status: 422 }
      )
    }

    const updated = await prisma.permitPackage.update({
      where: { id: params.id },
      data: {
        status: 'Submitted',
        internalStage: 'WaitingOnCounty',
        lastActivityAt: new Date(),
      },
    })

    await prisma.activityLog.create({
      data: {
        permitPackageId: params.id,
        userId: session.user.id,
        activityType: 'StatusChange',
        description: `Status changed from ${permit.status} to Submitted (submitted to county)`,
        oldValue: permit.status,
        newValue: 'Submitted',
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('POST /api/permits/[id]/submit:', error)
    return NextResponse.json({ error: 'Failed to submit package' }, { status: 500 })
  }
}
