/**
 * Contractor Detail API Route Handler
 * 
 * Handles GET (get contractor by ID), PATCH (update contractor), and DELETE (delete contractor) requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { contractorUpdateSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

// GET /api/contractors/[id] - Get contractor by ID
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

    const contractor = await prisma.contractor.findUnique({
      where: { id: params.id },
      include: {
        permitPackages: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { openedDate: 'desc' },
        },
      },
    })

    if (!contractor) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    return NextResponse.json({ data: contractor })
  } catch (error) {
    console.error('Error fetching contractor:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contractor' },
      { status: 500 }
    )
  }
}

// PATCH /api/contractors/[id] - Update contractor
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
    const validatedData = contractorUpdateSchema.parse(body)

    // Update contractor
    const contractor = await prisma.contractor.update({
      where: { id: params.id },
      data: validatedData,
    })

    return NextResponse.json({ data: contractor })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }
    console.error('Error updating contractor:', error)
    return NextResponse.json(
      { error: 'Failed to update contractor' },
      { status: 500 }
    )
  }
}

// DELETE /api/contractors/[id] - Delete contractor
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

    // Check if contractor has permit packages
    const permitCount = await prisma.permitPackage.count({
      where: { contractorId: params.id },
    })

    if (permitCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete contractor with existing permit packages' },
        { status: 400 }
      )
    }

    await prisma.contractor.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Contractor deleted successfully' })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }
    console.error('Error deleting contractor:', error)
    return NextResponse.json(
      { error: 'Failed to delete contractor' },
      { status: 500 }
    )
  }
}

