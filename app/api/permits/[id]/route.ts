/**
 * Permit Detail API Route Handler
 *
 * Handles GET (get permit by ID), PATCH (update permit), and DELETE (delete permit) requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { permitPackageUpdateSchema } from '@/lib/validations'
import { gateReadyToSubmit } from '@/lib/readiness-engine'
import { Prisma } from '@prisma/client'

// GET /api/permits/[id] - Get permit by ID with all related data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    enforce(normalizeRole(session.user?.role), 'read', 'package')

    const permitPackage = await prisma.permitPackage.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        contractor: true,
        documents: {
          include: {
            uploadedByUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { uploadedAt: 'desc' },
        },
        tasks: {
          orderBy: [
            { status: 'asc' },
            { dueDate: 'asc' },
          ],
        },
        activityLogs: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50, // Limit to recent activities
        },
      },
    })

    if (!permitPackage) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    return NextResponse.json({ data: permitPackage })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Error fetching permit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permit' },
      { status: 500 }
    )
  }
}

// PATCH /api/permits/[id] - Update permit
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = normalizeRole(session.user?.role)
    enforce(role, 'update', 'package')

    const body = await request.json()
    const validatedData = permitPackageUpdateSchema.parse(body)

    const currentPermit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
    })

    if (!currentPermit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    // ReadyToSubmit must go through the readiness gate (same as /status)
    if (validatedData.internalStage === 'ReadyToSubmit') {
      const gate = await gateReadyToSubmit(params.id, {
        overrideReadiness: body.overrideReadiness === true,
        overrideReason: typeof body.overrideReason === 'string' ? body.overrideReason : undefined,
      })

      if (!gate.ok) {
        return NextResponse.json(gate.body, { status: gate.status })
      }

      if (!gate.readiness.isReady && body.overrideReadiness === true) {
        enforce(role, 'override_readiness', 'checklist')
        await prisma.activityLog.create({
          data: {
            permitPackageId: params.id,
            userId: session.user.id,
            activityType: 'ReadinessOverridden',
            description: `Readiness gate overridden: ${body.overrideReason}`,
            metadata: JSON.stringify({
              blockers: gate.readiness.blockers,
              overrideReason: body.overrideReason,
              via: 'PATCH /api/permits/[id]',
            }),
          },
        })
      }
    }

    const data: Prisma.PermitPackageUpdateInput = { ...validatedData }
    if (validatedData.targetIssueDate) {
      data.targetIssueDate = new Date(validatedData.targetIssueDate)
    }

    const permitPackage = await prisma.permitPackage.update({
      where: { id: params.id },
      data,
      include: {
        customer: {
          select: { id: true, name: true },
        },
        contractor: {
          select: { id: true, companyName: true },
        },
      },
    })

    if (validatedData.status && validatedData.status !== currentPermit.status) {
      await prisma.activityLog.create({
        data: {
          permitPackageId: permitPackage.id,
          userId: session.user.id,
          activityType: 'StatusChange',
          description: `Status changed from ${currentPermit.status} to ${permitPackage.status}`,
          oldValue: currentPermit.status,
          newValue: permitPackage.status,
        },
      })
    }

    if (validatedData.billingStatus && validatedData.billingStatus !== currentPermit.billingStatus) {
      await prisma.activityLog.create({
        data: {
          permitPackageId: permitPackage.id,
          userId: session.user.id,
          activityType: 'BillingStatusChange',
          description: `Billing status changed from ${currentPermit.billingStatus} to ${permitPackage.billingStatus}`,
          oldValue: currentPermit.billingStatus,
          newValue: permitPackage.billingStatus,
        },
      })
    }

    if (
      validatedData.internalStage &&
      validatedData.internalStage !== currentPermit.internalStage
    ) {
      await prisma.activityLog.create({
        data: {
          permitPackageId: permitPackage.id,
          userId: session.user.id,
          activityType: 'StageChange',
          description: `Stage changed from ${currentPermit.internalStage ?? 'none'} to ${validatedData.internalStage}`,
          oldValue: currentPermit.internalStage ?? undefined,
          newValue: validatedData.internalStage,
        },
      })
    }

    return NextResponse.json({ data: permitPackage })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }
    console.error('Error updating permit:', error)
    return NextResponse.json(
      { error: 'Failed to update permit' },
      { status: 500 }
    )
  }
}

// DELETE /api/permits/[id] - Delete permit
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    enforce(normalizeRole(session.user?.role), 'delete', 'package')

    await prisma.permitPackage.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Permit deleted successfully' })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }
    console.error('Error deleting permit:', error)
    return NextResponse.json(
      { error: 'Failed to delete permit' },
      { status: 500 }
    )
  }
}
