/**
 * Customers API Route Handler
 * 
 * Handles GET (list all customers) and POST (create new customer) requests.
 * Provides pagination and search functionality for customer listing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { customerSchema } from '@/lib/validations'
import { handleApiError, parsePagination, requirePermission } from '@/lib/api-security'

// GET /api/customers - List all customers with optional search and pagination
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'read', 'customer')

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const { page, limit, skip } = parsePagination(searchParams)

    // Build where clause for search
    // Note: SQLite doesn't support case-insensitive mode, but it's case-insensitive for ASCII by default
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { contactName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}

    // Fetch customers with pagination
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.customer.count({ where }),
    ])

    return NextResponse.json({
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch customers')
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'create', 'customer')

    const body = await request.json()
    
    // Validate request data
    const validatedData = customerSchema.parse(body)

    // Create customer
    const customer = await prisma.customer.create({
      data: validatedData,
    })

    return NextResponse.json({ data: customer }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to create customer')
  }
}

