/**
 * Permits API Route Handler
 * 
 * Handles GET (list all permits with filters) and POST (create new permit) requests.
 * Provides advanced filtering, search, and pagination functionality.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { permitPackageSchema } from '@/lib/validations'

// GET /api/permits - List all permits with filters, search, and pagination
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const permitType = searchParams.get('permitType')
    const county = searchParams.get('county')
    const billingStatus = searchParams.get('billingStatus')
    const customerId = searchParams.get('customerId')
    const contractorId = searchParams.get('contractorId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Search across multiple fields
    if (search) {
      where.OR = [
        { projectName: { contains: search, mode: 'insensitive' as const } },
        { projectAddress: { contains: search, mode: 'insensitive' as const } },
        { permitNumber: { contains: search, mode: 'insensitive' as const } },
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
        { contractor: { companyName: { contains: search, mode: 'insensitive' as const } } },
      ]
    }

    // Apply filters
    if (status) where.status = status
    if (permitType) where.permitType = permitType
    if (county) where.county = { contains: county, mode: 'insensitive' as const }
    if (billingStatus) where.billingStatus = billingStatus
    if (customerId) where.customerId = customerId
    if (contractorId) where.contractorId = contractorId

    // Fetch permits with pagination
    const [permits, total] = await Promise.all([
      prisma.permitPackage.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, name: true },
          },
          contractor: {
            select: { id: true, companyName: true },
          },
          tasks: {
            where: { status: { not: 'Completed' } },
            orderBy: { dueDate: 'asc' },
            take: 1, // Get next task
          },
        },
        orderBy: { openedDate: 'desc' },
      }),
      prisma.permitPackage.count({ where }),
    ])

    return NextResponse.json({
      data: permits,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching permits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permits' },
      { status: 500 }
    )
  }
}

// POST /api/permits - Create a new permit package
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate request data
    const validatedData = permitPackageSchema.parse(body)

    // Convert date strings to Date objects
    const data: any = {
      ...validatedData,
      targetIssueDate: validatedData.targetIssueDate
        ? new Date(validatedData.targetIssueDate)
        : undefined,
    }

    // Create permit package
    const permitPackage = await prisma.permitPackage.create({
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

    // Create activity log entry
    await prisma.activityLog.create({
      data: {
        permitPackageId: permitPackage.id,
        userId: session.user.id,
        activityType: 'StatusChange',
        description: `Permit package created`,
        newValue: permitPackage.status,
      },
    })

    return NextResponse.json({ data: permitPackage }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    console.error('Error creating permit:', error)
    return NextResponse.json(
      { error: 'Failed to create permit' },
      { status: 500 }
    )
  }
}

