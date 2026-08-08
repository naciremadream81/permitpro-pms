/**
 * Permit Detail API Route Handler
 * 
 * Handles GET (get permit by ID), PATCH (update permit), and DELETE (delete permit) requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { syncChecklist } from '@/lib/checklist-engine'
import { prisma } from '@/lib/prisma'
import { permitPackageUpdateSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'
import { handleApiError, requirePermission } from '@/lib/api-security'

// GET /api/permits/[id] - Get permit by ID with all related data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'read', 'package')

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
    return handleApiError(error, 'Failed to fetch permit', { notFoundMessage: 'Permit not found' })
  }
}

// PATCH /api/permits/[id] - Update permit
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'update', 'package')

    const body = await request.json()

    // ReadyToSubmit (and other stage moves) must use POST /api/permits/[id]/status
    // so the readiness gate cannot be bypassed via this general update path.
    // Status transitions also must use that route — PATCH was skipping Approved →
    // "Send to Billing" automation and other status-route side effects.
    if (body?.internalStage !== undefined || body?.status !== undefined) {
      return NextResponse.json(
        {
          error:
            'status and internalStage cannot be updated via PATCH; use POST /api/permits/[id]/status',
        },
        { status: 400 }
      )
    }
    
    // Validate request data
    const validatedData = permitPackageUpdateSchema.parse(body)

    // Get current permit to track changes
    const currentPermit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
    })

    if (!currentPermit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    // Convert date strings to Date objects
    const data: Prisma.PermitPackageUpdateInput = { ...validatedData }
    if (validatedData.targetIssueDate) {
      data.targetIssueDate = new Date(validatedData.targetIssueDate)
    }

    // Update permit package
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

    // Jurisdiction / permit type changes must resync checklist items. Without this,
    // ReadyToSubmit can pass with an empty or stale checklist after a type switch.
    const jurisdictionChanged =
      validatedData.jurisdictionId !== undefined &&
      validatedData.jurisdictionId !== currentPermit.jurisdictionId
    const permitTypeChanged =
      validatedData.permitType !== undefined &&
      validatedData.permitType !== currentPermit.permitType
    if (jurisdictionChanged || permitTypeChanged) {
      await syncChecklist(params.id)
    }

    // Log status changes
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

    return NextResponse.json({ data: permitPackage })
  } catch (error) {
    return handleApiError(error, 'Failed to update permit', { notFoundMessage: 'Permit not found' })
  }
}

// DELETE /api/permits/[id] - Delete permit
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'delete', 'package')

    await prisma.permitPackage.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Permit deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'Failed to delete permit', { notFoundMessage: 'Permit not found' })
  }
}

