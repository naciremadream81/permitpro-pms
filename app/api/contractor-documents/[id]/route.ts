/**
 * Contractor Document API — GET / PATCH / DELETE individual document
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { contractorDocumentUpdateSchema } from '@/lib/validations'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const doc = await prisma.contractorDocument.findUnique({
      where: { id: (await params).id },
      include: { contractor: { select: { id: true, companyName: true } } },
    })

    if (!doc)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    return NextResponse.json({ data: doc })
  } catch (error) {
    console.error('GET /api/contractor-documents/[id]:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = normalizeRole(session.user?.role)
    const body = await request.json()

    // Verification requires coordinator or admin
    if ('isVerified' in body) {
      enforce(role, 'verify', 'contractor_document')
    } else {
      enforce(role, 'update', 'contractor_document')
    }

    const data = contractorDocumentUpdateSchema.parse(body)

    const updateData: Record<string, unknown> = { ...data }

    if (data.issueDate) updateData.issueDate = new Date(data.issueDate)
    if (data.expirationDate) updateData.expirationDate = new Date(data.expirationDate)

    if (data.isVerified === true) {
      updateData.verifiedBy = session.user.id
      updateData.verifiedAt = new Date()
    }

    const doc = await prisma.contractorDocument.update({
      where: { id: (await params).id },
      data: updateData,
    })

    return NextResponse.json({ data: doc })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    console.error('PATCH /api/contractor-documents/[id]:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'delete', 'contractor_document')

    await prisma.contractorDocument.delete({ where: { id: (await params).id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('DELETE /api/contractor-documents/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
