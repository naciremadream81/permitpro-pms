/**
 * Permit Status Update API Route Handler
 * 
 * Handles POST requests to update permit status with automatic activity logging
 * and optional task automation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { permitStatusUpdateSchema } from '@/lib/validations'

// POST /api/permits/[id]/status - Update permit status with logging
export async function POST(
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
    const validatedData = permitStatusUpdateSchema.parse(body)

    // Get current permit
    const currentPermit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
    })

    if (!currentPermit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {
      status: validatedData.status,
    }
    if (validatedData.internalStage) {
      updateData.internalStage = validatedData.internalStage
    }

    // Update permit
    const permitPackage = await prisma.permitPackage.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true },
        },
        contractor: {
          select: { id: true, companyName: true },
        },
      },
    })

    // Create activity log entry
    const activityDescription = validatedData.note
      ? `${validatedData.note} (Status: ${currentPermit.status} → ${permitPackage.status})`
      : `Status changed from ${currentPermit.status} to ${permitPackage.status}`

    await prisma.activityLog.create({
      data: {
        permitPackageId: permitPackage.id,
        userId: session.user.id,
        activityType: 'StatusChange',
        description: activityDescription,
        oldValue: currentPermit.status,
        newValue: permitPackage.status,
        metadata: validatedData.internalStage
          ? JSON.stringify({ internalStage: validatedData.internalStage })
          : undefined,
      },
    })

    // Auto-create tasks based on status (workflow automation)
    if (validatedData.status === 'Approved') {
      // Check if "Send to Billing" task already exists
      const existingTask = await prisma.task.findFirst({
        where: {
          permitPackageId: permitPackage.id,
          name: 'Send to Billing',
        },
      })

      if (!existingTask) {
        await prisma.task.create({
          data: {
            permitPackageId: permitPackage.id,
            name: 'Send to Billing',
            description: 'Permit approved - send to billing department',
            status: 'NotStarted',
            priority: 'high',
          },
        })

        await prisma.activityLog.create({
          data: {
            permitPackageId: permitPackage.id,
            userId: session.user.id,
            activityType: 'TaskCreated',
            description: 'Task "Send to Billing" auto-created',
          },
        })
      }
    }

    return NextResponse.json({ data: permitPackage })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    console.error('Error updating permit status:', error)
    return NextResponse.json(
      { error: 'Failed to update permit status' },
      { status: 500 }
    )
  }
}

