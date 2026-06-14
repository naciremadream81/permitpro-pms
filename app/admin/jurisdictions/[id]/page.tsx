'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Trash2, ToggleLeft, ToggleRight, ArrowLeft, Save } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'

type DocumentCategory =
  | 'Application' | 'Plans' | 'Specifications' | 'Engineering'
  | 'Photos' | 'Correspondence' | 'Inspection' | 'Certificate' | 'Other'

const PERMIT_TYPES = [
  'Building','Electrical','Plumbing','Mechanical',
  'Roofing','HVAC','Structural','MobileHome','Other',
]

const DOC_CATEGORIES: DocumentCategory[] = [
  'Application','Plans','Specifications','Engineering',
  'Photos','Correspondence','Inspection','Certificate','Other',
]

interface Requirement {
  id: string
  documentName: string
  documentCategory: DocumentCategory
  permitTypes: string
  isRequired: boolean
  isMandatoryForSubmission: boolean
  order: number
  description?: string
  helpText?: string
  isActive: boolean
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

export default function JurisdictionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New requirement form state
  const [newReq, setNewReq] = useState({
    documentName: '',
    documentCategory: 'Application' as DocumentCategory,
    permitTypes: ['*'],
    isRequired: true,
    isMandatoryForSubmission: true,
    description: '',
    helpText: '',
    order: 0,
  })

  useEffect(() => {
    fetchJurisdiction()
  }, [id])

  async function fetchJurisdiction() {
    setLoading(true)
    try {
      const res = await fetch(`/api/jurisdictions/${id}`)
      const json = await res.json()
      setJurisdiction(json.data)
    } finally {
      setLoading(false)
    }
  }

  async function addRequirement() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/jurisdictions/${id}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newReq,
          permitTypes: JSON.stringify(newReq.permitTypes),
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to add requirement')
        return
      }

      setNewReq({
        documentName: '',
        documentCategory: 'Application',
        permitTypes: ['*'],
        isRequired: true,
        isMandatoryForSubmission: true,
        description: '',
        helpText: '',
        order: 0,
      })
      setShowAddForm(false)
      fetchJurisdiction()
    } finally {
      setSaving(false)
    }
  }

  async function toggleRequirement(reqId: string, isActive: boolean) {
    await fetch(`/api/requirements/${reqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    fetchJurisdiction()
  }

  async function deleteRequirement(reqId: string) {
    if (!confirm('Remove this requirement? If packages reference it, it will be deactivated instead.')) return
    await fetch(`/api/requirements/${reqId}`, { method: 'DELETE' })
    fetchJurisdiction()
  }

  function parsePermitTypes(json: string): string[] {
    try { return JSON.parse(json) } catch { return [json] }
  }

  if (loading) return <div className="p-6 text-sm text-muted">Loading…</div>
  if (!jurisdiction) return (
    <AppLayout>
      <p className="text-sm text-destructive">Jurisdiction not found</p>
    </AppLayout>
  )

  return (
    <AppLayout>
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push('/admin/jurisdictions')}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-2"
          >
            <ArrowLeft className="w-3 h-3" />
            Jurisdictions
          </button>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">{jurisdiction.name}</h1>
          <p className="text-sm text-muted">
            {jurisdiction.countyCode} · {jurisdiction.state} ·{' '}
            <span className={jurisdiction.isActive ? 'text-success' : 'text-destructive'}>
              {jurisdiction.isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Requirement
        </button>
      </div>

      {error && (
        <div className="p-3 bg-surface border border-destructive rounded-lg text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add Requirement Form */}
      {showAddForm && (
        <div className="border border-accent rounded-xl p-5 bg-accent-muted space-y-4">
          <h2 className="font-medium text-ink text-sm">New Requirement</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">
                Document Name <span className="text-destructive">*</span>
              </label>
              <input
                value={newReq.documentName}
                onChange={(e) => setNewReq({ ...newReq, documentName: e.target.value })}
                placeholder="Site Plan"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Category</label>
              <select
                value={newReq.documentCategory}
                onChange={(e) => setNewReq({ ...newReq, documentCategory: e.target.value as DocumentCategory })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Applies to Permit Types</label>
              <div className="space-y-1 max-h-28 overflow-y-auto border border-border rounded-lg p-2 bg-surface text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newReq.permitTypes.includes('*')}
                    onChange={(e) => setNewReq({
                      ...newReq,
                      permitTypes: e.target.checked ? ['*'] : [],
                    })}
                  />
                  <span className="font-medium">All types</span>
                </label>
                {!newReq.permitTypes.includes('*') && PERMIT_TYPES.map((pt) => (
                  <label key={pt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReq.permitTypes.includes(pt)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...newReq.permitTypes.filter(t => t !== '*'), pt]
                          : newReq.permitTypes.filter(t => t !== pt)
                        setNewReq({ ...newReq, permitTypes: updated })
                      }}
                    />
                    {pt}
                  </label>
                ))}
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Description</label>
              <input
                value={newReq.description}
                onChange={(e) => setNewReq({ ...newReq, description: e.target.value })}
                placeholder="What this document is for"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="col-span-2 flex items-center gap-6 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newReq.isRequired}
                  onChange={(e) => setNewReq({ ...newReq, isRequired: e.target.checked })}
                />
                Required
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newReq.isMandatoryForSubmission}
                  onChange={(e) => setNewReq({ ...newReq, isMandatoryForSubmission: e.target.checked })}
                />
                Mandatory for submission (blocks readiness gate if missing)
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={addRequirement}
              disabled={saving || !newReq.documentName || newReq.permitTypes.length === 0}
              className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Requirement'}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-border text-ink hover:bg-surface-inset transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Requirements by permit type */}
      {jurisdiction.requirements.length === 0 ? (
        <div className="text-center py-12 text-muted border border-dashed border-border rounded-xl">
          <p className="font-medium">No requirements defined</p>
          <p className="text-sm mt-1">Add requirements to enable automatic checklist generation.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* All-types requirements first */}
          {(() => {
            const allTypes = jurisdiction.requirements.filter(r =>
              parsePermitTypes(r.permitTypes).includes('*')
            )
            if (allTypes.length === 0) return null
            return (
              <RequirementGroup
                label="All Permit Types"
                requirements={allTypes}
                onToggle={toggleRequirement}
                onDelete={deleteRequirement}
              />
            )
          })()}
          {PERMIT_TYPES.map((pt) => {
            const reqs = jurisdiction.requirements.filter(r => {
              const types = parsePermitTypes(r.permitTypes)
              return !types.includes('*') && types.includes(pt)
            })
            if (reqs.length === 0) return null
            return (
              <RequirementGroup
                key={pt}
                label={pt}
                requirements={reqs}
                onToggle={toggleRequirement}
                onDelete={deleteRequirement}
              />
            )
          })}
        </div>
      )}
    </div>
    </AppLayout>
  )
}

function RequirementGroup({
  label,
  requirements,
  onToggle,
  onDelete,
}: {
  label: string
  requirements: Requirement[]
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">
        {label}
      </h2>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-inset border-b border-border">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted">Document</th>
              <th className="text-left px-4 py-2 font-medium text-muted">Category</th>
              <th className="text-center px-4 py-2 font-medium text-muted">Required</th>
              <th className="text-center px-4 py-2 font-medium text-muted">Blocks Gate</th>
              <th className="text-center px-4 py-2 font-medium text-muted">Active</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requirements.map((req) => (
              <tr
                key={req.id}
                className={`hover:bg-surface-inset transition-colors ${!req.isActive ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-2">
                  <div className="font-medium text-ink">{req.documentName}</div>
                  {req.description && (
                    <div className="text-xs text-muted mt-0.5">{req.description}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-muted">{req.documentCategory}</td>
                <td className="px-4 py-2 text-center">
                  {req.isRequired ? (
                    <span className="text-xs font-medium text-success bg-status-success px-2 py-0.5">
                      Yes
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Optional</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  {req.isMandatoryForSubmission ? (
                    <span className="text-xs font-medium text-warning bg-status-warning px-2 py-0.5">
                      Blocks
                    </span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  <button onClick={() => onToggle(req.id, req.isActive)}>
                    {req.isActive ? (
                      <ToggleRight className="w-5 h-5 text-accent" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-border" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => onDelete(req.id)}
                    className="text-muted hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
