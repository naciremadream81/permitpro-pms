/**
 * Users API Route Handler
 * 
 * Handles GET (list all users) and POST (create new user) requests.
 * Admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { userSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/auth'

// GET /api/users - List users
//   Admin: full list with counts
//   Coordinator/Reviewer: lightweight list of reviewers only (for dropdowns)

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = session.user.role === 'admin'
    const { searchParams } = new URL(request.url)
    const roleFilter = searchParams.get('role') ?? undefined

    if (isAdmin) {
      // Full list with activity counts
      const users = await prisma.user.findMany({
        where: roleFilter ? { role: roleFilter } : undefined,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              activityLogs: true,
              uploadedDocs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ data: users })
    }

    // Coordinators/Reviewers: lightweight list scoped to reviewers
    // (used for assigning reviewers in permit detail)
    const users = await prisma.user.findMany({
      where: { role: roleFilter ?? 'reviewer' },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    await requireAdmin()

    const body = await request.json()
    
    // Validate request data
    const validatedData = userSchema.parse(body)

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        passwordHash,
        role: validatedData.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}

