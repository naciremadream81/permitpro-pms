/**
 * Permit Documents API Route Handler
 * 
 * Handles GET (list documents) and POST (upload document) requests.
 * Supports multipart/form-data for file uploads.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { storage, getMimeType } from '@/lib/storage'
import { documentCategoryEnum } from '@/lib/validations'
import { randomBytes } from 'crypto'

// GET /api/permits/[id]/documents - List all documents for a permit
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify permit exists
    const permit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
    })

    if (!permit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    const documents = await prisma.permitDocument.findMany({
      where: { permitPackageId: params.id },
      include: {
        uploadedByUser: {
          select: { id: true, name: true, email: true },
        },
        parentDocument: {
          select: { id: true, fileName: true, versionTag: true },
        },
      },
      orderBy: [
        { category: 'asc' },
        { uploadedAt: 'desc' },
      ],
    })

    // Group documents by version group
    const groupedDocuments = documents.reduce((acc, doc) => {
      const key = doc.versionGroupId || doc.id
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(doc)
      return acc
    }, {} as Record<string, typeof documents>)

    return NextResponse.json({
      data: documents,
      grouped: groupedDocuments,
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}

// POST /api/permits/[id]/documents - Upload a new document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify permit exists
    const permit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
    })

    if (!permit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = formData.get('category') as string
    const notes = formData.get('notes') as string | null
    const isRequired = formData.get('isRequired') === 'true'
    const isNewVersion = formData.get('isNewVersion') === 'true'
    const parentDocumentId = formData.get('parentDocumentId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate category
    const validatedCategory = documentCategoryEnum.parse(category)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Save file to storage
    const storagePath = await storage.save(buffer, file.name, params.id)

    // Generate version group ID if this is a new version
    let versionGroupId: string | undefined
    if (isNewVersion && parentDocumentId) {
      const parentDoc = await prisma.permitDocument.findUnique({
        where: { id: parentDocumentId },
      })
      versionGroupId = parentDoc?.versionGroupId || parentDocumentId
    } else if (isNewVersion) {
      versionGroupId = randomBytes(16).toString('hex')
    }

    // Determine version tag
    const existingVersions = await prisma.permitDocument.count({
      where: {
        permitPackageId: params.id,
        fileName: file.name,
        category: validatedCategory,
      },
    })
    const versionTag = existingVersions > 0 ? `v${existingVersions + 1}` : 'v1'

    // Create document record
    const document = await prisma.permitDocument.create({
      data: {
        permitPackageId: params.id,
        fileName: file.name,
        fileType: getMimeType(file.name),
        category: validatedCategory,
        uploadedBy: session.user.id,
        notes: notes || undefined,
        isRequired,
        fileSize: buffer.length,
        storagePath,
        versionTag,
        parentDocumentId: isNewVersion && parentDocumentId ? parentDocumentId : undefined,
        versionGroupId,
      },
      include: {
        uploadedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    // Create activity log entry
    await prisma.activityLog.create({
      data: {
        permitPackageId: params.id,
        userId: session.user.id,
        activityType: 'DocumentUploaded',
        description: `Document "${file.name}" uploaded (${validatedCategory})`,
      },
    })

    return NextResponse.json({ data: document }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      )
    }
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}

