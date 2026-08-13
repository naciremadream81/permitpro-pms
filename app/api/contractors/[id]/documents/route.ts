/**
 * Contractor Document Vault API — GET list / POST upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { contractorDocumentSchema } from '@/lib/validations'
import { handleApiError, requirePermission, validateUploadedFile } from '@/lib/api-security'

// GET /api/contractors/[id]/documents
export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    requirePermission(session, 'read', 'contractor_document')

    const contractor = await prisma.contractor.findUnique({ where: { id: params.id } })
    if (!contractor)
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })

    const documents = await prisma.contractorDocument.findMany({
      where: { contractorId: params.id },
      orderBy: [{ type: 'asc' }, { uploadedAt: 'desc' }],
    })

    // Annotate with computed expiry status
    const now = new Date()
    const annotated = documents.map((doc) => {
      let expiryStatus: 'valid' | 'expiring_soon' | 'expired' | 'unknown' = 'unknown'
      if (doc.expirationDate) {
        const daysLeft = Math.floor(
          (doc.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (daysLeft < 0) expiryStatus = 'expired'
        else if (daysLeft <= 30) expiryStatus = 'expiring_soon'
        else expiryStatus = 'valid'
      }
      return { ...doc, expiryStatus }
    })

    return NextResponse.json({ data: annotated })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch contractor documents')
  }
}

// POST /api/contractors/[id]/documents — upload a contractor compliance document
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'create', 'contractor_document')

    const contractor = await prisma.contractor.findUnique({ where: { id: params.id } })
    if (!contractor)
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file)
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const fileValidation = validateUploadedFile(file)
    if (!fileValidation.ok) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    const type = formData.get('type') as string
    const documentName = formData.get('documentName') as string
    const issueDate = formData.get('issueDate') as string | null
    const expirationDate = formData.get('expirationDate') as string | null
    const notes = formData.get('notes') as string | null

    const validated = contractorDocumentSchema.parse({
      type,
      documentName: documentName || file.name,
      issueDate: issueDate || undefined,
      expirationDate: expirationDate || undefined,
      notes: notes || undefined,
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    // Store under a contractor sub-path
    const storagePath = await storage.save(buffer, file.name, `contractors/${params.id}`)

    // Mark previous documents of the same type as superseded
    await prisma.contractorDocument.updateMany({
      where: {
        contractorId: { equals: params.id },
        type: { equals: validated.type },
        isSuperseded: false,
      },
      data: { isSuperseded: true },
    })

    const document = await prisma.contractorDocument.create({
      data: {
        contractorId: params.id,
        type: validated.type,
        documentName: validated.documentName,
        storagePath,
        fileSize: buffer.length,
        issueDate: validated.issueDate ? new Date(validated.issueDate) : undefined,
        expirationDate: validated.expirationDate
          ? new Date(validated.expirationDate)
          : undefined,
        uploadedBy: session.user.id,
        notes: validated.notes,
        status: 'ACTIVE',
      },
    })

    // Sync legacy expiry fields on contractor for backward compat
    if (validated.type === 'WORKERS_COMP' && validated.expirationDate) {
      await prisma.contractor.update({
        where: { id: params.id },
        data: { workersCompExpirationDate: new Date(validated.expirationDate) },
      })
    }
    if (validated.type === 'LIABILITY' && validated.expirationDate) {
      await prisma.contractor.update({
        where: { id: params.id },
        data: { liabilityExpirationDate: new Date(validated.expirationDate) },
      })
    }

    return NextResponse.json({ data: document }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to upload contractor document')
  }
}
