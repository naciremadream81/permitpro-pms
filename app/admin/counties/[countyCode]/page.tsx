'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ChevronRight, Plus, Trash2, ToggleLeft, ToggleRight, Save,
  History, X, RotateCcw, Clock,
  AlertTriangle, Pencil,
} from 'lucide-react'
import { FL_COUNTIES } from '@/lib/counties-seed-data'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────
type DocumentCategory =
  | 'Application' | 'Plans' | 'Specifications' | 'Engineering'
  | 'Photos' | 'Correspondence' | 'Inspection' | 'Certificate' | 'Other'

const PERMIT_TYPES = [
  'Building', 'Electrical', 'Plumbing', 'Mechanical',
  'Roofing', 'HVAC', 'Structural', 'MobileHome', 'Other',
]
const DOC_CATEGORIES: DocumentCategory[] = [
  'Application', 'Plans', 'Specifications', 'Engineering',
  'Photos', 'Correspondence', 'Inspection', 'Certificate', 'Other',
]

interface Requirement {
  id: string
  documentName: string
  documentCategory: DocumentCategory
  permitTypes: string
  isRequired: boolean
  isMandatoryForSubmission: boolean
  description?: string
  helpText?: string
  order: number
  isActive: boolean
}

interface ChangeLog {
  id: string
  action: string
  fieldName?: string
  oldValue?: string
  newValue?: string
  changedBy: string
  createdAt: string
  snapshot: string
  seedBatch?: { description?: string; startedAt: string }
}

interface Jurisdiction {
  id: string
  name: string
  countyCode: string
  state: string
  isActive: boolean
  notes?: string
  requirements: Requirement[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function parsePermitTypes(json: string): string[] {
  try { return JSON.parse(json) } catch { return [json] }
}

const ACTION_COLORS: Record<string, string> = {
  CREATED:     'text-success bg-surface',
  UPDATED:     'text-accent bg-accent-muted',
  ACTIVATED:   'text-success bg-surface',
  DEACTIVATED: 'text-warning bg-surface',
  DELETED:     'text-destructive bg-surface',
  RESTORED:    'text-review bg-surface',
}

// ── Inline Edit Row ───────────────────────────────────────────────────────────
function EditableRequirementRow({
  req,
  onSave,
  onToggle,
  onDelete,
  onShowHistory,
}: {
  req: Requirement
  onSave: (id: string, updates: Partial<Requirement>) => Promise<void>
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
  onShowHistory: (id: string) => void
  isAdmin?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...req })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(req.id, {
      documentName: draft.documentName,
      documentCategory: draft.documentCategory,
      isRequired: draft.isRequired,
      isMandatoryForSubmission: draft.isMandatoryForSubmission,
      description: draft.description,
      helpText: draft.helpText,
    })
    setEditing(false)
    setSaving(false)
  }

  if (editing) {
    return (
      <tr className="border-b border-border bg-accent-muted/40">
        <td colSpan={6} className="px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">Document Name</label>
              <input
                value={draft.documentName}
                onChange={e => setDraft({ ...draft, documentName: e.target.value })}
                className="pp-input"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Category</label>
              <select
                value={draft.documentCategory}
                onChange={e => setDraft({ ...draft, documentCategory: e.target.value as DocumentCategory })}
                className="pp-input"
              >
                {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-6 pt-5 text-sm text-ink">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={draft.isRequired}
                  onChange={e => setDraft({ ...draft, isRequired: e.target.checked })} />
                Required
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={draft.isMandatoryForSubmission}
                  onChange={e => setDraft({ ...draft, isMandatoryForSubmission: e.target.checked })} />
                Blocks gate
              </label>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted">Description</label>
              <input
                value={draft.description ?? ''}
                onChange={e => setDraft({ ...draft, description: e.target.value })}
                className="pp-input"
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving || !draft.documentName} className="gap-1.5">
                <Save className="h-3 w-3" />{saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setDraft({ ...req }); setEditing(false) }}>
                Cancel
              </Button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={cn('group border-b border-border transition-colors hover:bg-surface-inset', !req.isActive && 'opacity-40')}>
      <td className="px-4 py-2.5">
        <div className="text-sm font-medium text-ink">{req.documentName}</div>
        {req.description && <div className="mt-0.5 max-w-xs truncate text-xs text-muted">{req.description}</div>}
      </td>
      <td className="px-4 py-2.5 text-sm text-muted">{req.documentCategory}</td>
      <td className="px-4 py-2.5 text-center">
        {req.isRequired
          ? <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-success">Yes</span>
          : <span className="text-xs text-muted">Optional</span>}
      </td>
      <td className="px-4 py-2.5 text-center">
        {req.isMandatoryForSubmission
          ? <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-warning">Blocks</span>
          : <span className="text-xs text-muted">—</span>}
      </td>
      <td className="px-4 py-2.5 text-center">
        <button type="button" onClick={() => onToggle(req.id, req.isActive)} title={req.isActive ? 'Deactivate' : 'Activate'}>
          {req.isActive
            ? <ToggleRight className="h-5 w-5 text-accent" />
            : <ToggleLeft className="h-5 w-5 text-muted" />}
        </button>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button type="button" onClick={() => setEditing(true)} title="Edit"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-accent-muted hover:text-accent">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onShowHistory(req.id)} title="Version history"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-inset hover:text-ink">
            <History className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(req.id)} title="Delete"
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface-inset hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── History Drawer ────────────────────────────────────────────────────────────
function HistoryDrawer({
  requirementId,
  onClose,
  isAdmin,
}: {
  requirementId: string
  onClose: () => void
  isAdmin: boolean
}) {
  const [logs, setLogs] = useState<ChangeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/requirements/${requirementId}/history`)
      .then(r => r.json())
      .then(d => setLogs(d.data ?? []))
      .finally(() => setLoading(false))
  }, [requirementId])

  async function handleRestore(logId: string) {
    if (!confirm('Restore this requirement to this previous state?')) return
    setRestoring(logId)
    await fetch(`/api/requirements/${requirementId}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeLogId: logId }),
    })
    setRestoring(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold text-ink">Version History</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted transition-colors hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted">Loading history…</div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">No history yet.</div>
          ) : logs.map(log => (
            <div key={log.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className={cn('px-2 py-0.5 text-xs font-semibold', ACTION_COLORS[log.action] ?? 'bg-surface-inset text-muted')}>
                  {log.action}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Clock className="h-3 w-3" />
                  {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {log.fieldName && (
                <div className="text-xs text-muted">
                  <span className="font-medium text-ink">{log.fieldName}:</span>{' '}
                  <span className="line-through text-destructive">{log.oldValue}</span>
                  {' → '}
                  <span className="text-success">{log.newValue}</span>
                </div>
              )}
              {log.seedBatch && (
                <div className="text-xs italic text-muted">
                  Part of bulk seed: {log.seedBatch.description}
                </div>
              )}
              {isAdmin && log.action !== 'DELETED' && (
                <button
                  type="button"
                  onClick={() => handleRestore(log.id)}
                  disabled={restoring === log.id}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover"
                >
                  <RotateCcw className="h-3 w-3" />
                  {restoring === log.id ? 'Restoring…' : 'Restore to this version'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CountyDetailPage() {
  const { countyCode } = useParams<{ countyCode: string }>()

  const countyMeta = FL_COUNTIES.find(c => c.code === countyCode)
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyReqId, setHistoryReqId] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const isAdmin = true // TODO: wire to session.user.role

  const [newReq, setNewReq] = useState({
    documentName: '',
    documentCategory: 'Application' as DocumentCategory,
    permitTypes: ['*'] as string[],
    isRequired: true,
    isMandatoryForSubmission: true,
    description: '',
    helpText: '',
    order: 0,
  })

  useEffect(() => {
    fetchJurisdiction()
  }, [countyCode])

  async function fetchJurisdiction() {
    setLoading(true)
    try {
      const res = await fetch(`/api/jurisdictions?state=FL`)
      const json = await res.json()
      const all = json.data ?? []
      const found = all.find((j: Jurisdiction) => j.countyCode === countyCode)
      if (found) {
        // Fetch full detail with requirements
        const detail = await fetch(`/api/jurisdictions/${found.id}`)
        const d = await detail.json()
        setJurisdiction(d.data)
      } else {
        setJurisdiction(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function addRequirement() {
    if (!jurisdiction) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/jurisdictions/${jurisdiction.id}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newReq, permitTypes: JSON.stringify(newReq.permitTypes) }),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error ?? 'Failed'); return }
      setNewReq({ documentName: '', documentCategory: 'Application', permitTypes: ['*'], isRequired: true, isMandatoryForSubmission: true, description: '', helpText: '', order: 0 })
      setShowAddForm(false)
      fetchJurisdiction()
    } finally { setSaving(false) }
  }

  async function saveRequirement(id: string, updates: Partial<Requirement>) {
    await fetch(`/api/requirements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    fetchJurisdiction()
  }

  async function toggleRequirement(id: string, isActive: boolean) {
    await fetch(`/api/requirements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    fetchJurisdiction()
  }

  async function deleteRequirement(id: string) {
    if (!confirm('Remove this requirement?')) return
    await fetch(`/api/requirements/${id}`, { method: 'DELETE' })
    fetchJurisdiction()
  }

  const filteredReqs = useMemo(() => {
    if (!jurisdiction) return []
    return showInactive ? jurisdiction.requirements : jurisdiction.requirements.filter(r => r.isActive)
  }, [jurisdiction, showInactive])

  const requirementsByGroup = useMemo(() => {
    const allTypes = filteredReqs.filter(r => parsePermitTypes(r.permitTypes).includes('*'))
    const byType: Record<string, Requirement[]> = {}
    PERMIT_TYPES.forEach(pt => {
      byType[pt] = filteredReqs.filter(r => {
        const types = parsePermitTypes(r.permitTypes)
        return !types.includes('*') && types.includes(pt)
      })
    })
    return { allTypes, byType }
  }, [filteredReqs])

  const displayName = countyMeta ? `${countyMeta.name} County` : countyCode
  const totalActive = jurisdiction?.requirements.filter(r => r.isActive).length ?? 0

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-sm text-muted">Loading…</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted">
          <Link href="/admin/counties" className="transition-colors hover:text-ink">Counties</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink">{displayName}</span>
        </nav>

        <PageHeader
          title={displayName}
          description={`${countyCode} · FL · ${jurisdiction ? `${totalActive} active requirements` : 'Not seeded'}`}
          actions={
            <Button onClick={() => setShowAddForm(true)} disabled={!jurisdiction} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Requirement
            </Button>
          }
        />
        {/* Not seeded warning */}
        {!jurisdiction && (
          <div className="flex items-start gap-3 rounded-lg border border-warning bg-surface p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium text-warning">County not seeded yet</p>
              <p className="mt-1 text-sm text-warning">
                Use <strong>Seed All 67 Counties</strong> from the Counties overview, or it will be created automatically on first seed.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive bg-surface p-3 text-sm text-destructive">{error}</div>
        )}

        {jurisdiction && (
          <div className="flex items-center justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
              Show inactive requirements
            </label>
          </div>
        )}

        {/* Add form */}
        {showAddForm && jurisdiction && (
          <div className="space-y-4 rounded-lg border border-border bg-surface-inset p-5">
            <h2 className="text-sm font-semibold text-ink">New Requirement</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted">Document Name <span className="text-destructive">*</span></label>
                <input value={newReq.documentName} onChange={e => setNewReq({ ...newReq, documentName: e.target.value })}
                  placeholder="e.g. Site Plan" className="pp-input" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Category</label>
                <select value={newReq.documentCategory} onChange={e => setNewReq({ ...newReq, documentCategory: e.target.value as DocumentCategory })}
                  className="pp-input">
                  {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Permit Types</label>
                <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-border bg-surface p-2 text-sm text-ink">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={newReq.permitTypes.includes('*')}
                      onChange={e => setNewReq({ ...newReq, permitTypes: e.target.checked ? ['*'] : [] })} />
                    <span className="font-medium">All types</span>
                  </label>
                  {!newReq.permitTypes.includes('*') && PERMIT_TYPES.map(pt => (
                    <label key={pt} className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={newReq.permitTypes.includes(pt)}
                        onChange={e => setNewReq({ ...newReq, permitTypes: e.target.checked ? [...newReq.permitTypes.filter(t => t !== '*'), pt] : newReq.permitTypes.filter(t => t !== pt) })} />
                      {pt}
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted">Description</label>
                <input value={newReq.description} onChange={e => setNewReq({ ...newReq, description: e.target.value })}
                  className="pp-input" />
              </div>
              <div className="col-span-2 flex items-center gap-6 text-sm text-ink">
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={newReq.isRequired} onChange={e => setNewReq({ ...newReq, isRequired: e.target.checked })} />
                  Required
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={newReq.isMandatoryForSubmission} onChange={e => setNewReq({ ...newReq, isMandatoryForSubmission: e.target.checked })} />
                  Mandatory for submission
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addRequirement} disabled={saving || !newReq.documentName || newReq.permitTypes.length === 0} className="gap-2">
                <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Requirement'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Requirements grouped by permit type */}
        {jurisdiction && filteredReqs.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-muted">
            <p className="font-medium text-ink">No requirements</p>
            <p className="mt-1 text-sm">Add requirements above or use Seed All from the Counties overview.</p>
          </div>
        )}

        {jurisdiction && (
          <div className="space-y-5">
            {requirementsByGroup.allTypes.length > 0 && (
              <RequirementGroup label="All Permit Types" reqs={requirementsByGroup.allTypes}
                onSave={saveRequirement} onToggle={toggleRequirement} onDelete={deleteRequirement}
                onShowHistory={setHistoryReqId} isAdmin={isAdmin} />
            )}
            {PERMIT_TYPES.map(pt => requirementsByGroup.byType[pt]?.length > 0 && (
              <RequirementGroup key={pt} label={pt} reqs={requirementsByGroup.byType[pt]}
                onSave={saveRequirement} onToggle={toggleRequirement} onDelete={deleteRequirement}
                onShowHistory={setHistoryReqId} isAdmin={isAdmin} />
            ))}
          </div>
        )}

        {historyReqId && (
          <HistoryDrawer
            requirementId={historyReqId}
            onClose={() => { setHistoryReqId(null); fetchJurisdiction() }}
            isAdmin={isAdmin}
          />
        )}
      </div>
    </AppLayout>
  )
}

function RequirementGroup({
  label, reqs, onSave, onToggle, onDelete, onShowHistory, isAdmin,
}: {
  label: string
  reqs: Requirement[]
  onSave: (id: string, u: Partial<Requirement>) => Promise<void>
  onToggle: (id: string, a: boolean) => void
  onDelete: (id: string) => void
  onShowHistory: (id: string) => void
  isAdmin: boolean
}) {
  return (
    <div>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted">{label}</h2>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-inset">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Document</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted">Category</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-muted">Required</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-muted">Blocks Gate</th>
              <th className="px-4 py-2.5 text-center text-xs font-medium text-muted">Active</th>
              <th className="w-24 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {reqs.map(req => (
              <EditableRequirementRow
                key={req.id}
                req={req}
                onSave={onSave}
                onToggle={onToggle}
                onDelete={onDelete}
                onShowHistory={onShowHistory}
                isAdmin={isAdmin}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
