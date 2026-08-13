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
import { handleApiError, requirePermission, validateUploadedFile } from '@/lib/api-security'

// GET /api/permits/[id]/documents - List all documents for a permit
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'read', 'document')

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
    return handleApiError(error, 'Failed to fetch documents')
  }
}

// POST /api/permits/[id]/documents - Upload a new document
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    // Check authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'upload', 'document')

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

    const fileValidation = validateUploadedFile(file)
    if (!fileValidation.ok) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }

    // Validate category
    const validatedCategory = documentCategoryEnum.parse(category)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Resolve version parent before writing to storage so a rejected parent
    // (wrong package / missing id) cannot leave an orphan blob on disk.
    let versionGroupId: string | undefined
    let resolvedParentDocumentId: string | undefined
    if (isNewVersion && parentDocumentId) {
      // Parent must belong to this package — otherwise version groups can
      // cross-link documents across unrelated permits.
      const parentDoc = await prisma.permitDocument.findFirst({
        where: { id: parentDocumentId, permitPackageId: params.id },
      })
      if (!parentDoc) {
        return NextResponse.json(
          { error: 'Parent document must belong to this permit package' },
          { status: 400 }
        )
      }
      versionGroupId = parentDoc.versionGroupId || parentDocumentId
      resolvedParentDocumentId = parentDocumentId
    } else if (isNewVersion) {
      versionGroupId = randomBytes(16).toString('hex')
    }

    // Save file to storage only after request validation succeeds
    const storagePath = await storage.save(buffer, file.name, params.id)

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
        parentDocumentId: resolvedParentDocumentId,
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
    return handleApiError(error, 'Failed to upload document')
  }
}

