/**
 * Permit Detail API Route Handler
 * 
 * Handles GET (get permit by ID), PATCH (update permit), and DELETE (delete permit) requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { permitPackageUpdateSchema } from '@/lib/validations'

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

    const permitPackage = await prisma.permitPackage.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        contractor: true,
        documents: {
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
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
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
    const data: any = { ...validatedData }
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
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    if ((error as any)?.code === 'P2025') {
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
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.permitPackage.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Permit deleted successfully' })
  } catch (error) {
    if ((error as any)?.code === 'P2025') {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }
    console.error('Error deleting permit:', error)
    return NextResponse.json(
      { error: 'Failed to delete permit' },
      { status: 500 }
    )
  }
}

