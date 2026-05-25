/**
 * GET  /api/admin/permit-types   — list all permit type definitions
 * POST /api/admin/permit-types   — create a new custom permit type
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { DEFAULT_PERMIT_TYPES } from '@/lib/counties-seed-data'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const types = await prisma.permitTypeDefinition.findMany({
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    })

    // Seed built-in types if table is empty
    if (types.length === 0) {
      const createdBy = session.user?.id ? String(session.user.id) : 'system'

      for (const permitType of DEFAULT_PERMIT_TYPES) {
        await prisma.permitTypeDefinition.upsert({
          where: { code: permitType.code },
          update: {},
          create: {
            code: permitType.code,
            label: permitType.label,
            description: permitType.description,
            isBuiltIn: true,
            order: permitType.order,
            createdBy,
          },
        })
      }

      const seededTypes = await prisma.permitTypeDefinition.findMany({
        orderBy: [{ order: 'asc' }, { label: 'asc' }],
      })

      return NextResponse.json({ data: seededTypes })
    }

    return NextResponse.json({ data: types })
  } catch (error) {
    console.error('GET /api/admin/permit-types:', error)
    return NextResponse.json({ error: 'Failed to fetch permit types' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user?.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { code, label, description } = body

    if (!code || !label)
      return NextResponse.json({ error: 'code and label are required' }, { status: 400 })

    // Slugify code
    const slug = code.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')

    const existing = await prisma.permitTypeDefinition.findUnique({ where: { code: slug } })
    if (existing)
      return NextResponse.json({ error: 'A permit type with this code already exists' }, { status: 409 })

    const maxOrder = await prisma.permitTypeDefinition.aggregate({ _max: { order: true } })

    const created = await prisma.permitTypeDefinition.create({
      data: {
        code: slug,
        label: label.trim(),
        description: description?.trim() ?? null,
        isBuiltIn: false,
        isActive: true,
        order: (maxOrder._max.order ?? 0) + 1,
        createdBy: session.user?.id as string,
      },
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    console.error('POST /api/admin/permit-types:', error)
    return NextResponse.json({ error: 'Failed to create permit type' }, { status: 500 })
  }
}
