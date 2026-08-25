'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Plus, ToggleLeft, ToggleRight, Save, Lock, Pencil, X } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PermitTypeDefinition {
  id: string
  code: string
  label: string
  description?: string
  isActive: boolean
  isBuiltIn: boolean
  order: number
}

export default function PermitTypesPage() {
  const [types, setTypes] = useState<PermitTypeDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [newType, setNewType] = useState({ code: '', label: '', description: '' })
  const [editDraft, setEditDraft] = useState({ label: '', description: '' })

  useEffect(() => { fetchTypes() }, [])

  async function fetchTypes() {
    setLoading(true)
    try {
      await fetch('/api/admin/counties/seed', { method: 'POST' }).catch(() => {})
      const res = await fetch('/api/admin/permit-types')
      const json = await res.json()
      setTypes(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function addType() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/admin/permit-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newType),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed'); return }
      setNewType({ code: '', label: '', description: '' })
      setShowAddForm(false)
      fetchTypes()
    } finally { setSaving(false) }
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/permit-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    })
    setEditingId(null)
    fetchTypes()
  }

  async function toggleType(id: string, current: boolean) {
    await fetch(`/api/admin/permit-types/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    })
    fetchTypes()
  }

  async function deleteType(id: string) {
    if (!confirm('Deactivate this permit type? It will no longer appear in checklists.')) return
    await fetch(`/api/admin/permit-types/${id}`, { method: 'DELETE' })
    fetchTypes()
  }

  const builtIn  = types.filter(t => t.isBuiltIn)
  const custom   = types.filter(t => !t.isBuiltIn)

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <nav className="flex items-center gap-1.5 text-xs text-muted">
          <Link href="/admin/counties" className="transition-colors hover:text-ink">Counties</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-ink">Permit Types</span>
        </nav>

        <PageHeader
          title="Permit Types"
          description="Manage permit type definitions used in checklists"
          actions={
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Permit Type
            </Button>
          }
        />

        {error && (
          <div className="border-y border-destructive bg-surface py-3 text-sm text-destructive">{error}</div>
        )}

        {showAddForm && (
          <div className="space-y-4 border-y border-border bg-surface-inset py-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-ink">New Permit Type</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Code <span className="text-destructive">*</span></label>
                <input value={newType.code} onChange={e => setNewType({ ...newType, code: e.target.value })}
                  placeholder="e.g. Demolition" className="pp-input" />
                <p className="mt-1 text-xs text-muted">Used as internal identifier, auto-slugified</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Display Label <span className="text-destructive">*</span></label>
                <input value={newType.label} onChange={e => setNewType({ ...newType, label: e.target.value })}
                  placeholder="e.g. Demolition Permit" className="pp-input" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted">Description</label>
                <input value={newType.description} onChange={e => setNewType({ ...newType, description: e.target.value })}
                  placeholder="Optional description" className="pp-input" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addType} disabled={saving || !newType.code || !newType.label} className="gap-2">
                <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Permit Type'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Built-in Types</h2>
            <Lock className="h-3 w-3 text-muted" aria-hidden />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Description</th>
                  <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.08em] text-muted">Active</th>
                  <th className="w-16 px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">Loading…</td></tr>
                ) : builtIn.map(t => (
                  <tr key={t.id} className={cn('transition-colors hover:bg-surface-inset', !t.isActive && 'opacity-50')}>
                    <td className="px-4 py-2.5 font-medium text-ink">{t.label}</td>
                    <td className="bg-surface-inset/50 px-4 py-2.5 font-mono text-xs text-muted">{t.code}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">{t.description ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button type="button" onClick={() => toggleType(t.id, t.isActive)}>
                        {t.isActive
                          ? <ToggleRight className="inline h-5 w-5 text-accent" />
                          : <ToggleLeft className="inline h-5 w-5 text-muted" />}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span title="Built-in — cannot be deleted"><Lock className="inline h-3.5 w-3.5 text-muted/50" /></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(custom.length > 0 || !loading) && (
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Custom Types</h2>
            {custom.length === 0 ? (
              <div className="border-y border-border py-10 text-center text-sm text-muted">
                No custom permit types yet.{' '}
                <button type="button" onClick={() => setShowAddForm(true)} className="font-medium text-accent hover:underline">Add one</button>.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted">Description</th>
                      <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.08em] text-muted">Active</th>
                      <th className="w-20 px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {custom.map(t => (
                      <tr key={t.id} className={cn('group transition-colors hover:bg-surface-inset', !t.isActive && 'opacity-50')}>
                        {editingId === t.id ? (
                          <td colSpan={5} className="bg-accent-muted/40 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <input value={editDraft.label} onChange={e => setEditDraft({ ...editDraft, label: e.target.value })}
                                className="pp-input w-40" />
                              <input value={editDraft.description} onChange={e => setEditDraft({ ...editDraft, description: e.target.value })}
                                placeholder="Description" className="pp-input flex-1" />
                              <Button size="sm" onClick={() => saveEdit(t.id)} className="gap-1">
                                <Save className="h-3 w-3" />Save
                              </Button>
                              <button type="button" onClick={() => setEditingId(null)} className="p-1.5 text-muted hover:text-ink">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="px-4 py-2.5 font-medium text-ink">{t.label}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-muted">{t.code}</td>
                            <td className="px-4 py-2.5 text-xs text-muted">{t.description ?? '—'}</td>
                            <td className="px-4 py-2.5 text-center">
                              <button type="button" onClick={() => toggleType(t.id, t.isActive)}>
                                {t.isActive
                                  ? <ToggleRight className="inline h-5 w-5 text-accent" />
                                  : <ToggleLeft className="inline h-5 w-5 text-muted" />}
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                <button type="button" onClick={() => { setEditingId(t.id); setEditDraft({ label: t.label, description: t.description ?? '' }) }}
                                  className="p-1.5 text-muted hover:bg-accent-muted hover:text-accent">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button type="button" onClick={() => deleteType(t.id)}
                                  className="p-1.5 text-muted hover:bg-surface-inset hover:text-destructive">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
