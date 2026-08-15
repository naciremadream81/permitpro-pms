/**
 * Permit Tasks API Route Handler
 * 
 * Handles GET (list tasks for a permit) and POST (create task) requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { taskSchema } from '@/lib/validations'
import { handleApiError, requirePermission } from '@/lib/api-security'

// GET /api/permits/[id]/tasks - List all tasks for a permit
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'read', 'task')

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
    return handleApiError(error, 'Failed to fetch tasks')
  }
}

// POST /api/permits/[id]/tasks - Create a new task
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'create', 'task')

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
    // Note: We use permitPackageId directly as Prisma accepts both formats at runtime
    const { permitPackageId, dueDate, ...rest } = validatedData
    const data = {
      ...rest,
      permitPackageId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    } as unknown as Parameters<typeof prisma.task.create>[0]['data']

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
    return handleApiError(error, 'Failed to create task')
  }
}

