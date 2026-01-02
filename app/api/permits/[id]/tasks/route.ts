/**
 * Permit Tasks API Route Handler
 * 
 * Handles GET (list tasks for a permit) and POST (create task) requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { taskSchema } from '@/lib/validations'

// GET /api/permits/[id]/tasks - List all tasks for a permit
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

    // Verify permit exists
    const permit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
    })

    if (!permit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    const tasks = await prisma.task.findMany({
      where: { permitPackageId: params.id },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
      ],
    })

    return NextResponse.json({ data: tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// POST /api/permits/[id]/tasks - Create a new task
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
    const validatedData = taskSchema.parse({
      ...body,
      permitPackageId: params.id,
    })

    // Verify permit exists
    const permit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
    })

    if (!permit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    // Convert date string to Date object
    const data: any = {
      ...validatedData,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    }

    // Create task
    const task = await prisma.task.create({
      data,
    })

    // Create activity log entry
    await prisma.activityLog.create({
      data: {
        permitPackageId: params.id,
        userId: session.user.id,
        activityType: 'TaskCreated',
        description: `Task "${task.name}" created`,
      },
    })

    return NextResponse.json({ data: task }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}

