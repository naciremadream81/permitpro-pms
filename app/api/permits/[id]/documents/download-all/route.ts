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
import { buildExportZip } from '@/lib/export-engine'
import { handleApiError, requirePermission, sanitizeContentDispositionFilename } from '@/lib/api-security'

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    requirePermission(session, 'export', 'package')

    const profileId = request.nextUrl.searchParams.get('profileId')

    const permit = await prisma.permitPackage.findUnique({
      where: { id: params.id },
      select: { id: true, projectName: true },
    })

    if (!permit) {
      return NextResponse.json({ error: 'Permit not found' }, { status: 404 })
    }

    const result = await buildExportZip(params.id, profileId, session.user.id)

    const safeName = sanitizeContentDispositionFilename(result.fileName)
    return new NextResponse(result.buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': result.fileSize.toString(),
        'X-Checksum-SHA256': result.checksum,
        'X-Document-Count': result.documentCount.toString(),
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'No documents to export') {
      return NextResponse.json(
        { error: 'No documents found for this permit package' },
        { status: 404 }
      )
    }
    return handleApiError(error, 'Failed to create document package', { notFoundMessage: 'Permit not found' })
  }
}
