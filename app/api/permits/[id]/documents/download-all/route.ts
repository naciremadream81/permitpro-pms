/**
 * Download All Documents as ZIP
 *
 * Builds a structured ZIP using the Export Engine.
 * Accepts an optional `profileId` query param; falls back to the jurisdiction's
 * default profile (or flat layout if none configured).
 *
 * Records an ExportLog entry on every successful download.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { buildExportZip, ExportIncompleteError } from '@/lib/export-engine'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profileId = request.nextUrl.searchParams.get('profileId')

    const permit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
      select: { id: true, projectName: true },
    })

    if (!permit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    const result = await buildExportZip(params.id, profileId, session.user.id)

    return new NextResponse(result.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Content-Length': result.fileSize.toString(),
        'X-Checksum-SHA256': result.checksum,
        'X-Document-Count': result.documentCount.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    if (error instanceof ExportIncompleteError) {
      return NextResponse.json(
        {
          error: error.message,
          missingDocuments: error.missingDocuments,
        },
        { status: 422 }
      )
    }
    if (error instanceof Error && error.message === 'No documents to export') {
      return NextResponse.json(
        { error: 'No documents found for this permit package' },
        { status: 404 }
      )
    }
    console.error('Error creating document ZIP:', error)
    return NextResponse.json(
      { error: 'Failed to create document package' },
      { status: 500 }
    )
  }
}
