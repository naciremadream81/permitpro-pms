'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, Trash2, ToggleLeft, ToggleRight, ArrowLeft, Save } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'

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

const labelClass = 'mb-1 block text-xs font-medium uppercase tracking-[0.08em] text-muted'

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
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <button
              onClick={() => router.push('/admin/jurisdictions')}
              className="mb-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.08em] text-muted hover:text-ink"
            >
              <ArrowLeft className="h-3 w-3" />
              Jurisdictions
            </button>
            <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-ink">
              {jurisdiction.name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {jurisdiction.countyCode} · {jurisdiction.state} ·{' '}
              <span className={jurisdiction.isActive ? 'text-success' : 'text-destructive'}>
                {jurisdiction.isActive ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Requirement
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 border-b border-destructive py-2.5 text-sm">
            <span className="border border-destructive px-2 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-destructive">
              Error
            </span>
            <span className="text-ink">{error}</span>
          </div>
        )}

        {/* Add Requirement Form */}
        {showAddForm && (
          <section aria-label="New requirement" className="border-b border-border py-5">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ink">New Requirement</p>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>
                  Document Name <span className="text-destructive">*</span>
                </label>
                <input
                  value={newReq.documentName}
                  onChange={(e) => setNewReq({ ...newReq, documentName: e.target.value })}
                  placeholder="Site Plan"
                  className="pp-input"
                />
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={newReq.documentCategory}
                  onChange={(e) => setNewReq({ ...newReq, documentCategory: e.target.value as DocumentCategory })}
                  className="pp-input"
                >
                  {DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Applies to Permit Types</label>
                <div className="max-h-28 space-y-1 overflow-y-auto border border-border bg-surface p-2 text-sm">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newReq.permitTypes.includes('*')}
                      onChange={(e) => setNewReq({
                        ...newReq,
                        permitTypes: e.target.checked ? ['*'] : [],
                      })}
                    />
                    <span className="font-medium text-ink">All types</span>
                  </label>
                  {!newReq.permitTypes.includes('*') && PERMIT_TYPES.map((pt) => (
                    <label key={pt} className="flex cursor-pointer items-center gap-2 text-ink">
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
                <label className={labelClass}>Description</label>
                <input
                  value={newReq.description}
                  onChange={(e) => setNewReq({ ...newReq, description: e.target.value })}
                  placeholder="What this document is for"
                  className="pp-input"
                />
              </div>

              <div className="col-span-2 flex items-center gap-6 text-sm text-ink">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newReq.isRequired}
                    onChange={(e) => setNewReq({ ...newReq, isRequired: e.target.checked })}
                  />
                  Required
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newReq.isMandatoryForSubmission}
                    onChange={(e) => setNewReq({ ...newReq, isMandatoryForSubmission: e.target.checked })}
                  />
                  Mandatory for submission (blocks readiness gate if missing)
                </label>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                onClick={addRequirement}
                disabled={saving || !newReq.documentName || newReq.permitTypes.length === 0}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save Requirement'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </section>
        )}

        {/* Requirements by permit type */}
        {jurisdiction.requirements.length === 0 ? (
          <div className="border-b border-border py-14 text-center text-muted">
            <p className="font-medium text-ink">No requirements defined</p>
            <p className="mt-1 text-sm">Add requirements to enable automatic checklist generation.</p>
          </div>
        ) : (
          <div>
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

const thClass =
  'px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted'
const thClassCenter =
  'px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.08em] text-muted'

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
    <section className="pt-6" aria-label={label}>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full text-sm" aria-label={`${label} requirements`}>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={thClass}>Document</th>
              <th scope="col" className={thClass}>Category</th>
              <th scope="col" className={thClassCenter}>Required</th>
              <th scope="col" className={thClassCenter}>Blocks Gate</th>
              <th scope="col" className={thClassCenter}>Active</th>
              <th scope="col" className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requirements.map((req) => (
              <tr
                key={req.id}
                className={`transition-colors hover:bg-surface-inset ${!req.isActive ? 'opacity-50' : ''}`}
              >
                <td className="px-4 py-3">
                  <div className="font-bold text-ink">{req.documentName}</div>
                  {req.description && (
                    <div className="mt-0.5 text-xs text-muted">{req.description}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{req.documentCategory}</td>
                <td className="px-4 py-3 text-center">
                  {req.isRequired ? (
                    <span className="border border-success px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-success">
                      Required
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Optional</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {req.isMandatoryForSubmission ? (
                    <span className="border border-warning px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-warning">
                      Blocks
                    </span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onToggle(req.id, req.isActive)}>
                    {req.isActive ? (
                      <ToggleRight className="h-5 w-5 text-accent" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-border" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onDelete(req.id)}
                    className="text-muted transition-colors hover:text-destructive"
                    aria-label={`Remove ${req.documentName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
