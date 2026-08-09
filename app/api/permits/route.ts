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
import { generateChecklist } from '@/lib/checklist-engine'
import { Prisma } from '@prisma/client'
import { handleApiError, parsePagination, requirePermission } from '@/lib/api-security'

// GET /api/permits - List all permits with filters, search, and pagination
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'read', 'package')

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const permitType = searchParams.get('permitType')
    const county = searchParams.get('county')
    const billingStatus = searchParams.get('billingStatus')
    const customerId = searchParams.get('customerId')
    const contractorId = searchParams.get('contractorId')
    const { page, limit, skip } = parsePagination(searchParams)

    // Build where clause
    const where: Prisma.PermitPackageWhereInput = {}

    // Search across multiple fields
    // Note: SQLite doesn't support case-insensitive mode, but it's case-insensitive for ASCII by default
    if (search) {
      where.OR = [
        { projectName: { contains: search } },
        { projectAddress: { contains: search } },
        { permitNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { contractor: { companyName: { contains: search } } },
      ]
    }

    // Apply filters
    // Type assertions are safe here as the values come from URL query params and Prisma will validate at runtime
    if (status) where.status = status as unknown as Prisma.PermitPackageWhereInput['status']
    if (permitType) where.permitType = permitType as unknown as Prisma.PermitPackageWhereInput['permitType']
    if (county) where.county = { contains: county }
    if (billingStatus) where.billingStatus = billingStatus as unknown as Prisma.PermitPackageWhereInput['billingStatus']
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
    return handleApiError(error, 'Failed to fetch permits')
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
    requirePermission(session, 'create', 'package')

    const body = await request.json()
    
    // Validate request data
    const validatedData = permitPackageSchema.parse(body)

    // Creating directly as ReadyToSubmit skips evaluateReadiness() — force
    // callers through POST /api/permits/[id]/status after checklist setup.
    if (validatedData.internalStage === 'ReadyToSubmit') {
      return NextResponse.json(
        {
          error:
            'Cannot create a package as ReadyToSubmit; use POST /api/permits/[id]/status after readiness checks pass',
        },
        { status: 400 }
      )
    }

    // Creating as Approved skips the status-route billing automation that
    // auto-creates the "Send to Billing" task.
    if (validatedData.status === 'Approved') {
      return NextResponse.json(
        {
          error:
            'Cannot create a package as Approved; use POST /api/permits/[id]/status so billing automation runs',
        },
        { status: 400 }
      )
    }

    // Convert date strings to Date objects and structure for Prisma
    // Note: We use customerId/contractorId directly as Prisma accepts both formats at runtime
    const { customerId, contractorId, targetIssueDate, ...rest } = validatedData
    const data = {
      ...rest,
      customerId,
      contractorId,
      targetIssueDate: targetIssueDate ? new Date(targetIssueDate) : undefined,
    } as unknown as Parameters<typeof prisma.permitPackage.create>[0]['data']

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

    // Set lastActivityAt
    await prisma.permitPackage.update({
      where: { id: permitPackage.id },
      data: { lastActivityAt: new Date() },
    })

    // Auto-generate checklist from jurisdiction requirements (if jurisdiction linked)
    if (permitPackage.jurisdictionId) {
      await generateChecklist(permitPackage.id)
    }

    return NextResponse.json({ data: permitPackage }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to create permit')
  }
}

