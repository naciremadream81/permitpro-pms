/**
 * Contractors API Route Handler
 * 
 * Handles GET (list all contractors) and POST (create new contractor) requests.
 * Provides pagination and search functionality for contractor listing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { contractorSchema } from '@/lib/validations'
import { handleApiError, parsePagination, requirePermission } from '@/lib/api-security'

// GET /api/contractors - List all contractors with optional search and pagination
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'read', 'contractor')

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const { page, limit, skip } = parsePagination(searchParams)

    // Build where clause for search
    // Note: SQLite doesn't support case-insensitive mode, but it's case-insensitive for ASCII by default
    const where = search
      ? {
          OR: [
            { companyName: { contains: search } },
            { licenseNumber: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}

    // Fetch contractors with pagination
    const [contractors, total] = await Promise.all([
      prisma.contractor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { companyName: 'asc' },
      }),
      prisma.contractor.count({ where }),
    ])

    return NextResponse.json({
      data: contractors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch contractors')
  }
}

// POST /api/contractors - Create a new contractor
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'create', 'contractor')

    const body = await request.json()
    
    // Validate request data
    const validatedData = contractorSchema.parse(body)

    // Create contractor
    const contractor = await prisma.contractor.create({
      data: validatedData,
    })

    return NextResponse.json({ data: contractor }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to create contractor')
  }
}

