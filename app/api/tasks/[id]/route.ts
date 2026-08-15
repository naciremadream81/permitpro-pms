/**
 * Task Detail API Route Handler
 * 
 * Handles PATCH (update task) and DELETE (delete task) requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { taskUpdateSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'
import { handleApiError, requirePermission } from '@/lib/api-security'

// PATCH /api/tasks/[id] - Update task
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'update', 'task')

    const body = await request.json()
    
    // Validate request data
    const validatedData = taskUpdateSchema.parse(body)

    // Get current task
    const currentTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: { permitPackage: true },
    })

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Convert date string to Date object
    const data: Prisma.TaskUpdateInput = { ...validatedData }
    if (validatedData.dueDate) {
      data.dueDate = new Date(validatedData.dueDate)
    }

    // If status is being set to Completed, set completedAt
    if (validatedData.status === 'Completed' && currentTask.status !== 'Completed') {
      data.completedAt = new Date()
    } else if (validatedData.status !== 'Completed' && currentTask.status === 'Completed') {
      data.completedAt = null
    }

    // Update task
    const task = await prisma.task.update({
      where: { id: params.id },
      data,
    })

    // Create activity log entry
    if (validatedData.status && validatedData.status !== currentTask.status) {
      await prisma.activityLog.create({
        data: {
          permitPackageId: currentTask.permitPackageId,
          userId: session.user.id,
          activityType: task.status === 'Completed' ? 'TaskCompleted' : 'FieldUpdated',
          description: `Task "${task.name}" status changed to ${task.status}`,
          oldValue: currentTask.status,
          newValue: task.status,
        },
      })
    }

    return NextResponse.json({ data: task })
  } catch (error) {
    return handleApiError(error, 'Failed to update task', { notFoundMessage: 'Task not found' })
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'delete', 'task')

    const task = await prisma.task.findUnique({
      where: { id: params.id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'Failed to delete task', { notFoundMessage: 'Task not found' })
  }
}

