/**
 * Reports Page — Phase 2
 *
 * Tabbed interface for all built-in operational reports plus
 * a saved views panel for bookmarking filter configurations.
 */

'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import {
  BarChart3,
  Clock,
  ShieldAlert,
  Star,
  Bookmark,
  BookmarkCheck,
  Trash2,
  RefreshCw,
  Download,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

type ReportType = 'pipeline' | 'stalled' | 'contractor-compliance' | 'review-performance'

interface PipelineRow {
  id: string
  projectName: string
  projectAddress: string | null
  permitType: string
  status: string
  internalStage: string | null
  jurisdiction: string | null
  customer: string
  contractor: string
  coordinator: string | null
  openedDate: string
  targetIssueDate: string | null
  lastActivityAt: string
  daysIdle: number
  checklistPct: number
  contractorStatus: 'ok' | 'expiring' | 'expired'
  inReview: boolean
}

interface StalledRow {
  id: string
  projectName: string
  permitType: string
  status: string
  internalStage: string | null
  jurisdiction: string | null
  customer: string
  contractor: string
  coordinator: string | null
  lastActivityAt: string
  daysIdle: number
}

interface ContractorComplianceRow {
  id: string
  companyName: string
  licenseNumber: string | null
  email: string | null
  phone: string | null
  totalPackages: number
  activePackages: number
  overallStatus: 'compliant' | 'expiring' | 'expired' | 'incomplete'
  documents: {
    license: { status: string; daysLeft: number | null; expirationDate?: string }
    workersComp: { status: string; daysLeft: number | null; expirationDate?: string }
    liability: { status: string; daysLeft: number | null; expirationDate?: string }
    w9: { status: string; daysLeft: number | null }
  }
}

interface ReviewPerformanceRow {
  reviewer: { id: string; name: string; email: string }
  total: number
  approved: number
  sentBack: number
  approvalRate: number
  sendBackRate: number
  avgReviewHours: number | null
  slaComplianceRate: number | null
  avgCommentsPerReview: number
}

interface SavedReport {
  id: string
  name: string
  reportType: string
  isShared: boolean
  filters: string
  sortBy: string | null
  sortOrder: string
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function complianceBadge(status: string) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    compliant: { label: 'Compliant', cls: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
    expiring:  { label: 'Expiring',  cls: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="h-3 w-3" /> },
    expired:   { label: 'Expired',   cls: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
    incomplete:{ label: 'Incomplete',cls: 'bg-gray-100 text-gray-700', icon: <AlertTriangle className="h-3 w-3" /> },
    valid:     { label: 'Valid',     cls: 'bg-green-100 text-green-800', icon: null },
    missing:   { label: 'Missing',   cls: 'bg-gray-100 text-gray-600', icon: null },
  }
  const cfg = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600', icon: null }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', cfg.cls)}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

function pct(n: number | null, suffix = '%') {
  if (n === null) return <span className="text-gray-400 text-xs">—</span>
  return <span>{n}{suffix}</span>
}

function SortIcon({ field, sort }: { field: string; sort: { by: string; dir: 'asc' | 'desc' } }) {
  if (sort.by !== field) return <ChevronUp className="h-3 w-3 text-gray-300" />
  return sort.dir === 'asc'
    ? <ChevronUp className="h-3 w-3 text-blue-500" />
    : <ChevronDown className="h-3 w-3 text-blue-500" />
}

function Th({
  label, field, sort, onSort,
}: { label: string; field: string; sort: { by: string; dir: 'asc' | 'desc' }; onSort: (f: string) => void }) {
  return (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:text-gray-700"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label} <SortIcon field={field} sort={sort} />
      </span>
    </th>
  )
}

// ─── Pipeline Report ──────────────────────────────────────────────────────────

function PipelineReport() {
  const [rows, setRows] = useState<PipelineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<{ by: string; dir: 'asc' | 'desc' }>({ by: 'daysIdle', dir: 'desc' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/reports/pipeline')
    const json = await res.json()
    setRows(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggleSort(field: string) {
    setSort(s => s.by === field ? { by: field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { by: field, dir: 'asc' })
  }

  const sorted = [...rows].sort((a, b) => {
    const va = (a as Record<string, unknown>)[sort.by]
    const vb = (b as Record<string, unknown>)[sort.by]
    if (va === null || va === undefined) return 1
    if (vb === null || vb === undefined) return -1
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return sort.dir === 'asc' ? cmp : -cmp
  })

  if (loading) return <TableSkeleton cols={8} />

  return (
    <div className="overflow-x-auto">
      <p className="text-sm text-gray-500 mb-3">{rows.length} active packages</p>
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <Th label="Project" field="projectName" sort={sort} onSort={toggleSort} />
            <Th label="Type" field="permitType" sort={sort} onSort={toggleSort} />
            <Th label="Status" field="status" sort={sort} onSort={toggleSort} />
            <Th label="Stage" field="internalStage" sort={sort} onSort={toggleSort} />
            <Th label="Jurisdiction" field="jurisdiction" sort={sort} onSort={toggleSort} />
            <Th label="Coordinator" field="coordinator" sort={sort} onSort={toggleSort} />
            <Th label="Idle (days)" field="daysIdle" sort={sort} onSort={toggleSort} />
            <Th label="Checklist" field="checklistPct" sort={sort} onSort={toggleSort} />
            <Th label="Contractor" field="contractorStatus" sort={sort} onSort={toggleSort} />
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <a href={`/permits/${row.id}`} className="text-blue-600 hover:underline font-medium">{row.projectName}</a>
                {row.inReview && <span className="ml-2 text-xs bg-purple-100 text-purple-700 rounded-full px-1.5">In Review</span>}
              </td>
              <td className="px-3 py-2 text-gray-600">{row.permitType}</td>
              <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
              <td className="px-3 py-2 text-gray-600">{row.internalStage ?? '—'}</td>
              <td className="px-3 py-2 text-gray-600">{row.jurisdiction ?? '—'}</td>
              <td className="px-3 py-2 text-gray-600">{row.coordinator ?? '—'}</td>
              <td className={cn('px-3 py-2 font-medium tabular-nums', row.daysIdle >= 7 ? 'text-red-600' : row.daysIdle >= 3 ? 'text-yellow-600' : 'text-gray-700')}>
                {row.daysIdle}d
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div className={cn('h-1.5 rounded-full', row.checklistPct === 100 ? 'bg-green-500' : 'bg-blue-500')} style={{ width: `${row.checklistPct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{row.checklistPct}%</span>
                </div>
              </td>
              <td className="px-3 py-2">{complianceBadge(row.contractorStatus)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Stalled Report ───────────────────────────────────────────────────────────

function StalledReport() {
  const [rows, setRows] = useState<StalledRow[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(3)
  const [sort, setSort] = useState<{ by: string; dir: 'asc' | 'desc' }>({ by: 'daysIdle', dir: 'desc' })

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/reports/stalled?days=${days}`)
    const json = await res.json()
    setRows(json.data ?? [])
    setLoading(false)
  }, [days])

  useEffect(() => { load() }, [load])

  function toggleSort(field: string) {
    setSort(s => s.by === field ? { by: field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { by: field, dir: 'asc' })
  }

  const sorted = [...rows].sort((a, b) => {
    const va = (a as Record<string, unknown>)[sort.by]
    const vb = (b as Record<string, unknown>)[sort.by]
    if (va === null || va === undefined) return 1
    if (vb === null || vb === undefined) return -1
    const cmp = va < vb ? -1 : va > vb ? 1 : 0
    return sort.dir === 'asc' ? cmp : -cmp
  })

  if (loading) return <TableSkeleton cols={6} />

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Idle threshold:</label>
        {[3, 5, 7, 14].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn('px-2.5 py-1 rounded text-sm font-medium border', days === d ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-gray-400')}
          >
            {d}d
          </button>
        ))}
        <span className="text-sm text-red-600 font-medium ml-2">{rows.length} stalled</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <Th label="Project" field="projectName" sort={sort} onSort={toggleSort} />
              <Th label="Type" field="permitType" sort={sort} onSort={toggleSort} />
              <Th label="Status" field="status" sort={sort} onSort={toggleSort} />
              <Th label="Customer" field="customer" sort={sort} onSort={toggleSort} />
              <Th label="Coordinator" field="coordinator" sort={sort} onSort={toggleSort} />
              <Th label="Idle (days)" field="daysIdle" sort={sort} onSort={toggleSort} />
              <Th label="Last Activity" field="lastActivityAt" sort={sort} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <a href={`/permits/${row.id}`} className="text-blue-600 hover:underline font-medium">{row.projectName}</a>
                </td>
                <td className="px-3 py-2 text-gray-600">{row.permitType}</td>
                <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
                <td className="px-3 py-2 text-gray-600">{row.customer}</td>
                <td className="px-3 py-2 text-gray-600">{row.coordinator ?? '—'}</td>
                <td className={cn('px-3 py-2 font-semibold tabular-nums', row.daysIdle >= 14 ? 'text-red-700' : row.daysIdle >= 7 ? 'text-orange-600' : 'text-yellow-600')}>
                  {row.daysIdle}d
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{new Date(row.lastActivityAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Contractor Compliance ────────────────────────────────────────────────────

function ContractorComplianceReport() {
  const [rows, setRows] = useState<ContractorComplianceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports/contractor-compliance')
      .then(r => r.json())
      .then(j => { setRows(j.data ?? []); setLoading(false) })
  }, [])

  if (loading) return <TableSkeleton cols={7} />

  const expired = rows.filter(r => r.overallStatus === 'expired').length
  const expiring = rows.filter(r => r.overallStatus === 'expiring').length

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-sm">
        {expired > 0 && <span className="text-red-600 font-medium">{expired} expired</span>}
        {expiring > 0 && <span className="text-yellow-600 font-medium">{expiring} expiring soon</span>}
        <span className="text-gray-500">{rows.length} total contractors</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">License</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Workers Comp</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Liability</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">W9</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Active Pkgs</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <a href={`/contractors/${row.id}`} className="text-blue-600 hover:underline font-medium">{row.companyName}</a>
                  {row.licenseNumber && <div className="text-xs text-gray-400">{row.licenseNumber}</div>}
                </td>
                <td className="px-3 py-2">{complianceBadge(row.overallStatus)}</td>
                <td className="px-3 py-2">
                  {complianceBadge(row.documents.license.status)}
                  {row.documents.license.daysLeft !== null && row.documents.license.daysLeft <= 30 && (
                    <div className="text-xs text-gray-400 mt-0.5">{row.documents.license.daysLeft}d left</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {complianceBadge(row.documents.workersComp.status)}
                  {row.documents.workersComp.daysLeft !== null && row.documents.workersComp.daysLeft <= 30 && (
                    <div className="text-xs text-gray-400 mt-0.5">{row.documents.workersComp.daysLeft}d left</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {complianceBadge(row.documents.liability.status)}
                  {row.documents.liability.daysLeft !== null && row.documents.liability.daysLeft <= 30 && (
                    <div className="text-xs text-gray-400 mt-0.5">{row.documents.liability.daysLeft}d left</div>
                  )}
                </td>
                <td className="px-3 py-2">{complianceBadge(row.documents.w9.status)}</td>
                <td className="px-3 py-2 text-center font-medium">{row.activePackages}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Review Performance ───────────────────────────────────────────────────────

function ReviewPerformanceReport() {
  const [rows, setRows] = useState<ReviewPerformanceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/reports/review-performance')
      .then(r => r.json())
      .then(j => { setRows(j.data ?? []); setLoading(false) })
  }, [])

  if (loading) return <TableSkeleton cols={7} />

  return (
    <div className="overflow-x-auto">
      <p className="text-sm text-gray-500 mb-3">{rows.length} reviewers with completed assignments</p>
      <table className="w-full text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reviewer</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Approved</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Sent Back</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Approval Rate</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Hours</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">SLA %</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Comments</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(row => (
            <tr key={row.reviewer.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="font-medium">{row.reviewer.name}</div>
                <div className="text-xs text-gray-400">{row.reviewer.email}</div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">{row.total}</td>
              <td className="px-3 py-2 text-right tabular-nums text-green-700">{row.approved}</td>
              <td className="px-3 py-2 text-right tabular-nums text-orange-600">{row.sentBack}</td>
              <td className="px-3 py-2 text-right">
                <span className={cn('font-medium', row.approvalRate >= 80 ? 'text-green-700' : row.approvalRate >= 60 ? 'text-yellow-600' : 'text-red-600')}>
                  {pct(row.approvalRate)}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{pct(row.avgReviewHours, 'h')}</td>
              <td className="px-3 py-2 text-right">
                {row.slaComplianceRate !== null
                  ? <span className={cn('font-medium', row.slaComplianceRate >= 80 ? 'text-green-700' : 'text-yellow-600')}>{row.slaComplianceRate}%</span>
                  : <span className="text-gray-400 text-xs">—</span>}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{row.avgCommentsPerReview}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-8 bg-gray-100 rounded" />
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex gap-2">
          {[...Array(cols)].map((_, j) => (
            <div key={j} className="h-8 bg-gray-50 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Saved Views Panel ────────────────────────────────────────────────────────

function SavedViewsPanel({ activeType, onLoad }: {
  activeType: ReportType
  onLoad: (report: SavedReport) => void
}) {
  const [reports, setReports] = useState<SavedReport[]>([])
  const [loading, setLoading] = useState(true)
  const [saveName, setSaveName] = useState('')
  const [saveShared, setSaveShared] = useState(false)
  const [saving, setSaving] = useState(false)

  async function refresh() {
    const res = await fetch('/api/reports/saved')
    const json = await res.json()
    setReports(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  async function saveView() {
    if (!saveName.trim()) return
    setSaving(true)
    await fetch('/api/reports/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: saveName.trim(),
        isShared: saveShared,
        reportType: activeType.toUpperCase().replace(/-/g, '_') as string,
        filters: '{}',
        columns: '[]',
      }),
    })
    setSaveName('')
    setSaveShared(false)
    setSaving(false)
    await refresh()
  }

  async function deleteReport(id: string) {
    await fetch(`/api/reports/saved/${id}`, { method: 'DELETE' })
    setReports(prev => prev.filter(r => r.id !== id))
  }

  const typeMap: Record<string, ReportType> = {
    PACKAGE_PIPELINE: 'pipeline',
    STALLED_PACKAGES: 'stalled',
    CONTRACTOR_COMPLIANCE: 'contractor-compliance',
    REVIEW_PERFORMANCE: 'review-performance',
  }

  return (
    <div className="space-y-4">
      {/* Save current view */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Save Current View</p>
        <input
          type="text"
          placeholder="View name..."
          value={saveName}
          onChange={e => setSaveName(e.target.value)}
          className="w-full text-sm border rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={saveShared} onChange={e => setSaveShared(e.target.checked)} />
          Share with team
        </label>
        <Button size="sm" className="w-full" onClick={saveView} disabled={saving || !saveName.trim()}>
          <Bookmark className="h-3.5 w-3.5 mr-1" />
          {saving ? 'Saving…' : 'Save View'}
        </Button>
      </div>

      {/* Saved list */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Saved Views</p>
        {loading ? (
          <div className="space-y-1 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-gray-100 rounded" />)}
          </div>
        ) : reports.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No saved views yet.</p>
        ) : (
          <ul className="space-y-1">
            {reports.map(r => (
              <li key={r.id} className="flex items-center gap-1 group rounded hover:bg-gray-50 px-1 py-1">
                <button
                  className="flex-1 text-left text-sm truncate text-gray-700 hover:text-blue-600"
                  onClick={() => onLoad(r)}
                >
                  <span className="flex items-center gap-1.5">
                    {r.isShared ? <BookmarkCheck className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" /> : <Bookmark className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />}
                    {r.name}
                  </span>
                  <span className="block text-xs text-gray-400 pl-5">
                    {typeMap[r.reportType] ?? r.reportType}
                  </span>
                </button>
                <button
                  onClick={() => deleteReport(r.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-0.5 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: ReportType; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'pipeline', label: 'Package Pipeline', icon: <BarChart3 className="h-4 w-4" />, description: 'All active packages with operational metrics' },
  { id: 'stalled', label: 'Stalled Packages', icon: <Clock className="h-4 w-4" />, description: 'Packages with no recent activity' },
  { id: 'contractor-compliance', label: 'Contractor Compliance', icon: <ShieldAlert className="h-4 w-4" />, description: 'License and insurance expiry status' },
  { id: 'review-performance', label: 'Review Performance', icon: <Star className="h-4 w-4" />, description: 'Per-reviewer approval and SLA metrics' },
]

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>('pipeline')
  const [refreshKey, setRefreshKey] = useState(0)

  function handleLoadSaved(report: SavedReport) {
    const typeMap: Record<string, ReportType> = {
      PACKAGE_PIPELINE: 'pipeline',
      STALLED_PACKAGES: 'stalled',
      CONTRACTOR_COMPLIANCE: 'contractor-compliance',
      REVIEW_PERFORMANCE: 'review-performance',
    }
    const tab = typeMap[report.reportType]
    if (tab) { setActiveTab(tab); setRefreshKey(k => k + 1) }
  }

  const activeTabConfig = TABS.find(t => t.id === activeTab)!

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">Operational analytics and compliance tracking</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/reports/${activeTab}?format=csv`} download>
                <Download className="h-3.5 w-3.5 mr-1" /> Export
              </a>
            </Button>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* Main panel */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-0 border-b mb-4">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Report card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {activeTabConfig.icon}
                  <CardTitle className="text-base">{activeTabConfig.label}</CardTitle>
                </div>
                <p className="text-xs text-gray-500">{activeTabConfig.description}</p>
              </CardHeader>
              <CardContent key={`${activeTab}-${refreshKey}`}>
                {activeTab === 'pipeline' && <PipelineReport />}
                {activeTab === 'stalled' && <StalledReport />}
                {activeTab === 'contractor-compliance' && <ContractorComplianceReport />}
                {activeTab === 'review-performance' && <ReviewPerformanceReport />}
              </CardContent>
            </Card>
          </div>

          {/* Saved views sidebar */}
          <div className="w-56 flex-shrink-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Saved Views</CardTitle>
              </CardHeader>
              <CardContent>
                <SavedViewsPanel activeType={activeTab} onLoad={handleLoadSaved} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
