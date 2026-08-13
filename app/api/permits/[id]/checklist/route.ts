/**
 * Permit Checklist API — GET checklist / POST regenerate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { generateChecklist, checklistCompletionPct } from '@/lib/checklist-engine'

// GET /api/permits/[id]/checklist — fetch all checklist items with requirement detail
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permit = await prisma.permitPackage.findUnique({ where: { id: (await params).id } })
    if (!permit) return NextResponse.json({ error: 'Permit not found' }, { status: 404 })

    const items = await prisma.checklistItem.findMany({
      where: { packageId: (await params).id },
      include: {
        requirement: {
          select: {
            documentName: true,
            documentCategory: true,
            description: true,
            helpText: true,
            isRequired: true,
            isMandatoryForSubmission: true,
            order: true,
          },
        },
        document: {
          select: {
            id: true,
            fileName: true,
            status: true,
            isVerified: true,
            uploadedAt: true,
            versionTag: true,
            uploadedByUser: { select: { name: true } },
          },
        },
      },
      orderBy: [{ requirement: { order: 'asc' } }],
    })

    const completionPct = await checklistCompletionPct((await params).id)

    return NextResponse.json({ data: items, completionPct })
  } catch (error) {
    console.error('GET /api/permits/[id]/checklist:', error)
    return NextResponse.json({ error: 'Failed to fetch checklist' }, { status: 500 })
  }
}

// POST /api/permits/[id]/checklist — (re)generate checklist from jurisdiction requirements
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permit = await prisma.permitPackage.findUnique({ where: { id: (await params).id } })
    if (!permit) return NextResponse.json({ error: 'Permit not found' }, { status: 404 })

    const result = await generateChecklist((await params).id)

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    console.error('POST /api/permits/[id]/checklist:', error)
    return NextResponse.json({ error: 'Failed to generate checklist' }, { status: 500 })
  }
}
