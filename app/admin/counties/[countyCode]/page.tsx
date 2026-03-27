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
  CREATED:     'text-emerald-600 bg-emerald-50',
  UPDATED:     'text-blue-600 bg-blue-50',
  ACTIVATED:   'text-emerald-600 bg-emerald-50',
  DEACTIVATED: 'text-amber-600 bg-amber-50',
  DELETED:     'text-red-600 bg-red-50',
  RESTORED:    'text-purple-600 bg-purple-50',
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
  isAdmin: boolean
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
      <tr className="bg-blue-50 border-b border-blue-100">
        <td colSpan={6} className="px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Document Name</label>
              <input
                value={draft.documentName}
                onChange={e => setDraft({ ...draft, documentName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={draft.documentCategory}
                onChange={e => setDraft({ ...draft, documentCategory: e.target.value as DocumentCategory })}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-6 text-sm pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={draft.isRequired}
                  onChange={e => setDraft({ ...draft, isRequired: e.target.checked })} />
                Required
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={draft.isMandatoryForSubmission}
                  onChange={e => setDraft({ ...draft, isMandatoryForSubmission: e.target.checked })} />
                Blocks gate
              </label>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                value={draft.description ?? ''}
                onChange={e => setDraft({ ...draft, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button onClick={handleSave} disabled={saving || !draft.documentName}
                className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
                <Save className="w-3 h-3" />{saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setDraft({ ...req }); setEditing(false) }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`group hover:bg-gray-50 transition-colors border-b border-gray-100 ${!req.isActive ? 'opacity-40' : ''}`}>
      <td className="px-4 py-2.5">
        <div className="font-medium text-gray-900 text-sm">{req.documentName}</div>
        {req.description && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{req.description}</div>}
      </td>
      <td className="px-4 py-2.5 text-sm text-gray-600">{req.documentCategory}</td>
      <td className="px-4 py-2.5 text-center">
        {req.isRequired
          ? <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Yes</span>
          : <span className="text-xs text-gray-400">Optional</span>}
      </td>
      <td className="px-4 py-2.5 text-center">
        {req.isMandatoryForSubmission
          ? <span className="text-xs font-medium text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">Blocks</span>
          : <span className="text-xs text-gray-400">—</span>}
      </td>
      <td className="px-4 py-2.5 text-center">
        <button onClick={() => onToggle(req.id, req.isActive)} title={req.isActive ? 'Deactivate' : 'Activate'}>
          {req.isActive
            ? <ToggleRight className="w-5 h-5 text-blue-500" />
            : <ToggleLeft className="w-5 h-5 text-gray-300" />}
        </button>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} title="Edit"
            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onShowHistory(req.id)} title="Version history"
            className="p-1.5 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors">
            <History className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(req.id)} title="Delete"
            className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Version History</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-sm text-gray-400 py-8 text-center">Loading history…</div>
          ) : logs.length === 0 ? (
            <div className="text-sm text-gray-400 py-8 text-center">No history yet.</div>
          ) : logs.map(log => (
            <div key={log.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] ?? 'text-gray-600 bg-gray-100'}`}>
                  {log.action}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {log.fieldName && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">{log.fieldName}:</span>{' '}
                  <span className="line-through text-red-400">{log.oldValue}</span>
                  {' → '}
                  <span className="text-emerald-600">{log.newValue}</span>
                </div>
              )}
              {log.seedBatch && (
                <div className="text-xs text-gray-400 italic">
                  Part of bulk seed: {log.seedBatch.description}
                </div>
              )}
              {isAdmin && log.action !== 'DELETED' && (
                <button
                  onClick={() => handleRestore(log.id)}
                  disabled={restoring === log.id}
                  className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
            <Link href="/admin" className="hover:text-white transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <Link href="/admin/counties" className="hover:text-white transition-colors">Counties</Link>
            <ChevronRight className="w-3 h-3 text-gray-600" />
            <span className="text-white">{displayName}</span>
          </nav>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">{displayName}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {countyCode} · FL ·{' '}
                {jurisdiction
                  ? <span className="text-emerald-400">{totalActive} active requirements</span>
                  : <span className="text-red-400">Not seeded</span>}
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              disabled={!jurisdiction}
              className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-400 disabled:opacity-40 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Requirement
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Not seeded warning */}
        {!jurisdiction && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 text-sm">County not seeded yet</p>
              <p className="text-sm text-amber-700 mt-1">
                Use <strong>Seed All 67 Counties</strong> from the Counties overview, or it will be created automatically on first seed.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Controls */}
        {jurisdiction && (
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
              Show inactive requirements
            </label>
          </div>
        )}

        {/* Add form */}
        {showAddForm && jurisdiction && (
          <div className="border border-blue-200 rounded-xl p-5 bg-blue-50 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">New Requirement</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Document Name <span className="text-red-500">*</span></label>
                <input value={newReq.documentName} onChange={e => setNewReq({ ...newReq, documentName: e.target.value })}
                  placeholder="e.g. Site Plan" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select value={newReq.documentCategory} onChange={e => setNewReq({ ...newReq, documentCategory: e.target.value as DocumentCategory })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Permit Types</label>
                <div className="space-y-1 max-h-28 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newReq.permitTypes.includes('*')}
                      onChange={e => setNewReq({ ...newReq, permitTypes: e.target.checked ? ['*'] : [] })} />
                    <span className="font-medium">All types</span>
                  </label>
                  {!newReq.permitTypes.includes('*') && PERMIT_TYPES.map(pt => (
                    <label key={pt} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newReq.permitTypes.includes(pt)}
                        onChange={e => setNewReq({ ...newReq, permitTypes: e.target.checked ? [...newReq.permitTypes.filter(t => t !== '*'), pt] : newReq.permitTypes.filter(t => t !== pt) })} />
                      {pt}
                    </label>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input value={newReq.description} onChange={e => setNewReq({ ...newReq, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2 flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newReq.isRequired} onChange={e => setNewReq({ ...newReq, isRequired: e.target.checked })} />
                  Required
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newReq.isMandatoryForSubmission} onChange={e => setNewReq({ ...newReq, isMandatoryForSubmission: e.target.checked })} />
                  Mandatory for submission
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addRequirement} disabled={saving || !newReq.documentName || newReq.permitTypes.length === 0}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Requirement'}
              </button>
              <button onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Requirements grouped by permit type */}
        {jurisdiction && filteredReqs.length === 0 && (
          <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <p className="font-medium">No requirements</p>
            <p className="text-sm mt-1">Add requirements above or use Seed All from the Counties overview.</p>
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
      </div>

      {/* History drawer */}
      {historyReqId && (
        <HistoryDrawer
          requirementId={historyReqId}
          onClose={() => { setHistoryReqId(null); fetchJurisdiction() }}
          isAdmin={isAdmin}
        />
      )}
    </div>
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
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">{label}</h2>
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Document</th>
              <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Category</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Required</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Blocks Gate</th>
              <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Active</th>
              <th className="px-4 py-2.5 w-24" />
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
