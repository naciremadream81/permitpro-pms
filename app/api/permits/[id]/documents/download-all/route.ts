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
import { getSession, ForbiddenError } from '@/lib/auth-helpers'
import { enforce, normalizeRole } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { buildExportZip } from '@/lib/export-engine'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    enforce(normalizeRole(session.user?.role), 'export', 'package')

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
    if (error instanceof ForbiddenError)
      return NextResponse.json({ error: error.message }, { status: 403 })
    if (error instanceof Error && error.message === 'No documents to export') {
      return NextResponse.json(
        { error: 'No documents found for this permit package' },
        { status: 404 }
      )
    }
    if (error instanceof Error && error.message.startsWith('Export aborted:')) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('Error creating document ZIP:', error)
    return NextResponse.json(
      { error: 'Failed to create document package' },
      { status: 500 }
    )
  }
}
