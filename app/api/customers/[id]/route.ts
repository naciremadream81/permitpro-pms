/**
 * Customer Detail API Route Handler
 * 
 * Handles GET (get customer by ID), PATCH (update customer), and DELETE (delete customer) requests.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { customerUpdateSchema } from '@/lib/validations'
import { handleApiError, requirePermission } from '@/lib/api-security'

// GET /api/customers/[id] - Get customer by ID
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
    requirePermission(session, 'read', 'customer')

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        permitPackages: {
          include: {
            contractor: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
          orderBy: { openedDate: 'desc' },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ data: customer })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch customer', { notFoundMessage: 'Customer not found' })
  }
}

// PATCH /api/customers/[id] - Update customer
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
    requirePermission(session, 'update', 'customer')

    const body = await request.json()
    
    // Validate request data
    const validatedData = customerUpdateSchema.parse(body)

    // Update customer
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: validatedData,
    })

    return NextResponse.json({ data: customer })
  } catch (error) {
    return handleApiError(error, 'Failed to update customer', { notFoundMessage: 'Customer not found' })
  }
}

// DELETE /api/customers/[id] - Delete customer
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
    requirePermission(session, 'delete', 'customer')

    // Check if customer has permit packages
    const permitCount = await prisma.permitPackage.count({
      where: { customerId: params.id },
    })

    if (permitCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with existing permit packages' },
        { status: 400 }
      )
    }

    await prisma.customer.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    return handleApiError(error, 'Failed to delete customer', { notFoundMessage: 'Customer not found' })
  }
}

