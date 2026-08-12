/**
 * Contractor Document Vault API — GET list / POST upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  assertWithinUploadRequestLimit,
  FileValidationError,
  storage,
  validateUploadFile,
} from '@/lib/storage'
import { contractorDocumentSchema } from '@/lib/validations'

// GET /api/contractors/[id]/documents
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    console.error('GET /api/contractors/[id]/documents:', error)
    return NextResponse.json({ error: 'Failed to fetch contractor documents' }, { status: 500 })
  }
}

// POST /api/contractors/[id]/documents — upload a contractor compliance document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    enforce(normalizeRole(session.user?.role), 'create', 'contractor_document')

    const contractor = await prisma.contractor.findUnique({ where: { id: params.id } })
    if (!contractor)
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })

    assertWithinUploadRequestLimit(request.headers.get('content-length'))

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file)
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })

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
    const validatedFile = validateUploadFile(buffer, file.name, file.type)
    // Store under a contractor sub-path
    const storagePath = await storage.save(buffer, validatedFile.fileName, `contractors/${params.id}`)

    // Mark previous documents of the same type as superseded
    await prisma.contractorDocument.updateMany({
      where: {
        contractorId: params.id,
        type: validated.type,
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
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.name === 'ZodError')
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 })
    if (error instanceof FileValidationError)
      return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('POST /api/contractors/[id]/documents:', error)
    return NextResponse.json({ error: 'Failed to upload contractor document' }, { status: 500 })
  }
}
