/**
 * Export Engine
 *
 * Builds structured ZIP packages for county submission using ExportProfile
 * configuration. Handles folder layout, file naming patterns, and manifest
 * generation. Falls back to flat structure when no profile is provided.
 */

import archiver from 'archiver'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'
import { createHash } from 'crypto'

export interface ExportResult {
  buffer: Buffer
  fileName: string
  fileSize: number
  checksum: string
  documentCount: number
  manifest: string
}

interface FolderRule {
  folder: string
  categories: string[]
}

/**
 * Build a ZIP package for a permit, optionally using an ExportProfile.
 *
 * @param packageId   ID of the PermitPackage
 * @param profileId   Optional ExportProfile ID (uses flat layout if omitted)
 * @param exportedBy  User ID performing the export (for ExportLog)
 */
export async function buildExportZip(
  packageId: string,
  profileId?: string | null,
  exportedBy?: string
): Promise<ExportResult> {
  // Load package with all related data needed for manifest
  const pkg = await prisma.permitPackage.findUnique({
    where: { id: packageId },
    include: {
      customer: { select: { name: true } },
      contractor: { select: { companyName: true, licenseNumber: true } },
      jurisdiction: { select: { name: true } },
      documents: {
        orderBy: [{ category: 'asc' }, { uploadedAt: 'asc' }],
      },
    },
  })

  if (!pkg) throw new Error(`Package ${packageId} not found`)

  if (pkg.documents.length === 0) {
    throw new Error('No documents to export')
  }

  // Load profile (if any)
  const profile = profileId
    ? await prisma.exportProfile.findUnique({ where: { id: profileId } })
    : await prisma.exportProfile.findFirst({
        where: {
          OR: [
            { jurisdictionId: pkg.jurisdictionId ?? undefined, isDefault: true },
            { jurisdictionId: null, isDefault: true },
          ],
        },
        orderBy: { jurisdictionId: 'desc' }, // prefer jurisdiction-specific
      })

  const folderRules: FolderRule[] = profile?.folderStructure
    ? safeParseJson<FolderRule[]>(profile.folderStructure, [])
    : []

  const namingPattern = profile?.fileNamingPattern ?? '{category}_{fileName}'
  const includeManifest = profile?.includeManifest ?? true

  // Load every storage blob before opening the archive so a missing file never
  // produces a partial ZIP + ExportLog GENERATED for county submission.
  const resolvedDocs: {
    buffer: Buffer
    archivePath: string
    category: string
    fileSize: number
    isVerified: boolean
  }[] = []
  const missingDocuments: { id: string; fileName: string }[] = []

  for (const doc of pkg.documents) {
    try {
      const fileBuffer = await storage.get(doc.storagePath)
      const archiveName = buildFileName(namingPattern, doc.category, doc.fileName, doc.versionTag)
      const folder = resolveFolder(folderRules, doc.category)
      const archivePath = folder ? `${folder}/${archiveName}` : archiveName
      resolvedDocs.push({
        buffer: fileBuffer,
        archivePath,
        category: doc.category,
        fileSize: doc.fileSize,
        isVerified: doc.isVerified,
      })
    } catch (err) {
      console.error(`Export: could not add document ${doc.id}:`, err)
      missingDocuments.push({ id: doc.id, fileName: doc.fileName })
    }
  }

  if (missingDocuments.length > 0) {
    const names = missingDocuments.map((d) => d.fileName).join(', ')
    throw new ExportIncompleteError(
      `Export aborted: ${missingDocuments.length} document(s) missing from storage: ${names}`,
      missingDocuments
    )
  }

  // Build archive
  const archive = archiver('zip', { zlib: { level: 6 } })
  const chunks: Buffer[] = []
  archive.on('data', (c: Buffer) => chunks.push(c))

  const archiveReady = new Promise<Buffer>((resolve, reject) => {
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)
  })

  const manifestLines: string[] = [
    `PERMIT PACKAGE MANIFEST`,
    `========================`,
    `Package:      ${pkg.projectName}`,
    `Address:      ${pkg.projectAddress}`,
    `Customer:     ${pkg.customer.name}`,
    `Contractor:   ${pkg.contractor.companyName}${pkg.contractor.licenseNumber ? ` (Lic: ${pkg.contractor.licenseNumber})` : ''}`,
    `Jurisdiction: ${pkg.jurisdiction?.name ?? pkg.county ?? 'Not specified'}`,
    `Permit Type:  ${pkg.permitType}`,
    `Permit #:     ${pkg.permitNumber ?? 'Pending'}`,
    `Exported:     ${new Date().toISOString()}`,
    `Profile:      ${profile?.name ?? 'Default (flat)'}`,
    ``,
    `DOCUMENTS`,
    `---------`,
  ]

  // Disambiguate colliding archive paths so unzip/county portals cannot
  // silently overwrite one document with another of the same name.
  // Reserve MANIFEST.txt first when it will be appended — a document named
  // MANIFEST.txt (e.g. with fileNamingPattern "{fileName}") must not collide.
  const usedPaths = new Set<string>()
  if (includeManifest) {
    usedPaths.add('MANIFEST.txt')
  }
  for (const doc of resolvedDocs) {
    doc.archivePath = uniquifyArchivePath(doc.archivePath, usedPaths)
  }

  let docCount = 0
  for (const doc of resolvedDocs) {
    archive.append(doc.buffer, { name: doc.archivePath })
    manifestLines.push(
      `  [${doc.isVerified ? '✓' : ' '}] ${doc.archivePath}` +
        `  (${doc.category}, ${formatBytes(doc.fileSize)}, ` +
        `${doc.isVerified ? 'Verified' : 'Unverified'})`
    )
    docCount++
  }

  manifestLines.push(``, `Total: ${docCount} document(s)`)

  const manifestText = manifestLines.join('\n')

  if (includeManifest) {
    archive.append(Buffer.from(manifestText, 'utf8'), { name: 'MANIFEST.txt' })
  }

  await archive.finalize()
  const zipBuffer = await archiveReady

  const permitName = pkg.projectName.replace(/[^a-zA-Z0-9]/g, '_')
  const dateStr = new Date().toISOString().split('T')[0]
  const profileSuffix = profile ? `_${profile.name.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
  const fileName = `${permitName}${profileSuffix}_${dateStr}.zip`
  const checksum = createHash('sha256').update(zipBuffer).digest('hex')

  // Write ExportLog record
  if (exportedBy) {
    await prisma.exportLog.create({
      data: {
        packageId,
        exportedBy,
        profileId: profile?.id,
        fileName,
        fileSize: zipBuffer.length,
        checksum,
        status: 'GENERATED',
      },
    })

    await prisma.activityLog.create({
      data: {
        permitPackageId: packageId,
        userId: exportedBy,
        activityType: 'PackageExported',
        description: `Package exported as "${fileName}"${profile ? ` using profile "${profile.name}"` : ''}`,
        metadata: JSON.stringify({ fileName, profileId: profile?.id, documentCount: docCount }),
      },
    })

    await prisma.permitPackage.update({
      where: { id: packageId },
      data: { lastActivityAt: new Date() },
    })
  }

  return {
    buffer: zipBuffer,
    fileName,
    fileSize: zipBuffer.length,
    checksum,
    documentCount: docCount,
    manifest: manifestText,
  }
}

export class ExportIncompleteError extends Error {
  readonly missingDocuments: { id: string; fileName: string }[]

  constructor(
    message: string,
    missingDocuments: { id: string; fileName: string }[]
  ) {
    super(message)
    this.name = 'ExportIncompleteError'
    this.missingDocuments = missingDocuments
  }
}

// ============================================================================
// Helpers
// ============================================================================

function resolveFolder(rules: FolderRule[], category: string): string | null {
  if (!rules.length) return null
  const match = rules.find((r) => r.categories.includes(category))
  return match?.folder ?? rules[rules.length - 1]?.folder ?? null
}

function buildFileName(
  pattern: string,
  category: string,
  fileName: string,
  versionTag?: string | null
): string {
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_')
  return pattern
    .replace('{category}', safe(category))
    .replace('{fileName}', safe(fileName))
    .replace('{version}', safe(versionTag ?? 'v1'))
}

/** Ensure each archive entry path is unique within the ZIP. */
export function uniquifyArchivePath(archivePath: string, usedPaths: Set<string>): string {
  if (!usedPaths.has(archivePath)) {
    usedPaths.add(archivePath)
    return archivePath
  }

  const lastSlash = archivePath.lastIndexOf('/')
  const dir = lastSlash >= 0 ? archivePath.slice(0, lastSlash + 1) : ''
  const base = lastSlash >= 0 ? archivePath.slice(lastSlash + 1) : archivePath
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  const ext = dot > 0 ? base.slice(dot) : ''

  let n = 2
  let candidate = `${dir}${stem}_${n}${ext}`
  while (usedPaths.has(candidate)) {
    n += 1
    candidate = `${dir}${stem}_${n}${ext}`
  }
  usedPaths.add(candidate)
  return candidate
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function safeParseJson<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T } catch { return fallback }
}
