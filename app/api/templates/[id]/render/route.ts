/**
 * Template Render API
 *
 * POST /api/templates/:id/render
 *
 * Accepts a JSON map of merge field values and returns the rendered HTML.
 * Supports:
 *   - Simple: {{field_name}}
 *   - Permit shortcuts: {{permit.projectName}}, {{permit.county}}, etc.
 *   - Contractor shortcuts: {{contractor.companyName}}, etc.
 *   - Customer shortcuts: {{customer.name}}, etc.
 *   - Date helper: {{today}}, {{today+30}}
 *
 * Body:
 *   {
 *     "values": { "key": "value", ... }  // explicit overrides
 *     "packageId": "..."                  // optional — auto-populates permit/contractor/customer fields
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

function applyMergeFields(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const k = key.trim()

    // Date helpers
    if (k === 'today') return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const offsetMatch = k.match(/^today\+(\d+)$/)
    if (offsetMatch) {
      const d = new Date(Date.now() + parseInt(offsetMatch[1]) * 86_400_000)
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    return vars[k] ?? `{{${k}}}` // Leave unresolved placeholders visible
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const template = await prisma.documentTemplate.findUnique({ where: { id } })
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (template.status === 'ARCHIVED')
      return NextResponse.json({ error: 'Template is archived' }, { status: 410 })

    const body: { values?: Record<string, string>; packageId?: string } = await request.json()
    const vars: Record<string, string> = { ...(body.values ?? {}) }

    // Auto-populate from package if provided
    if (body.packageId) {
      const pkg = await prisma.permitPackage.findUnique({
        where: { id: body.packageId },
        include: { customer: true, contractor: true, coordinator: true, jurisdiction: true },
      })
      if (pkg) {
        vars['permit.projectName']   = pkg.projectName
        vars['permit.projectAddress']= pkg.projectAddress ?? ''
        vars['permit.county']        = pkg.county ?? ''
        vars['permit.permitType']    = pkg.permitType
        vars['permit.permitNumber']  = pkg.permitNumber ?? ''
        vars['permit.status']        = pkg.status
        vars['permit.internalStage'] = pkg.internalStage ?? ''
        vars['permit.openedDate']    = new Date(pkg.openedDate).toLocaleDateString()
        vars['permit.targetIssueDate'] = pkg.targetIssueDate
          ? new Date(pkg.targetIssueDate).toLocaleDateString()
          : ''
        vars['customer.name']        = pkg.customer.name
        vars['customer.email']       = pkg.customer.email ?? ''
        vars['customer.phone']       = pkg.customer.phone ?? ''
        vars['contractor.companyName'] = pkg.contractor.companyName
        vars['contractor.licenseNumber'] = pkg.contractor.licenseNumber ?? ''
        vars['coordinator.name']     = pkg.coordinator?.name ?? ''
        vars['jurisdiction.name']    = pkg.jurisdiction?.name ?? ''
      }
    }

    const rendered = applyMergeFields(template.content, vars)

    return NextResponse.json({
      data: {
        templateId: template.id,
        templateCode: template.code,
        version: template.version,
        rendered,
        unresolvedCount: (rendered.match(/\{\{[^}]+\}\}/g) ?? []).length,
      },
    })
  } catch (error) {
    console.error('POST /api/templates/[id]/render:', error)
    return NextResponse.json({ error: 'Render failed' }, { status: 500 })
  }
}
