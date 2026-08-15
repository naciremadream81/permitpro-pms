/**
 * Contractor Detail API Route Handler
 * 
 * Handles GET (get contractor by ID), PATCH (update contractor), and DELETE (delete contractor) requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { contractorUpdateSchema } from '@/lib/validations'
import { handleApiError, requirePermission } from '@/lib/api-security'
import { deleteContractorIfNoPackages } from '@/lib/safe-parent-delete'

// GET /api/contractors/[id] - Get contractor by ID
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'read', 'contractor')

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
    return handleApiError(error, 'Failed to fetch contractor', { notFoundMessage: 'Contractor not found' })
  }
}

// PATCH /api/contractors/[id] - Update contractor
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'update', 'contractor')

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
    return handleApiError(error, 'Failed to update contractor', { notFoundMessage: 'Contractor not found' })
  }
}

// DELETE /api/contractors/[id] - Delete contractor
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'delete', 'contractor')

    // Atomic guard: PermitPackage.contractor is ON DELETE CASCADE, so a
    // count-then-delete race can wipe a package created in the gap.
    const result = await deleteContractorIfNoPackages(params.id)
    if (result === 'has_packages') {
      return NextResponse.json(
        { error: 'Cannot delete contractor with existing permit packages' },
        { status: 400 }
      )
    }
    if (result === 'not_found') {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Contractor deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'Failed to delete contractor', { notFoundMessage: 'Contractor not found' })
  }
}

