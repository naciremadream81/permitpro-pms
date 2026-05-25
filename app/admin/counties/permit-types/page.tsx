'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, ToggleLeft, ToggleRight, Save, Lock, Pencil, X } from 'lucide-react'

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
  const router = useRouter()
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-5">
          <button onClick={() => router.push('/admin/counties')}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 mb-3 transition-colors">
            <ArrowLeft className="w-3 h-3" />All Counties
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Permit Types</h1>
              <p className="text-sm text-gray-400 mt-0.5">Manage permit type definitions used in checklists</p>
            </div>
            <button onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-400 transition-colors">
              <Plus className="w-4 h-4" />Add Permit Type
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* Add form */}
        {showAddForm && (
          <div className="border border-blue-200 rounded-xl p-5 bg-blue-50 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">New Permit Type</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Code <span className="text-red-500">*</span></label>
                <input value={newType.code} onChange={e => setNewType({ ...newType, code: e.target.value })}
                  placeholder="e.g. Demolition"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-400 mt-1">Used as internal identifier, auto-slugified</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Display Label <span className="text-red-500">*</span></label>
                <input value={newType.label} onChange={e => setNewType({ ...newType, label: e.target.value })}
                  placeholder="e.g. Demolition Permit"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input value={newType.description} onChange={e => setNewType({ ...newType, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addType} disabled={saving || !newType.code || !newType.label}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Permit Type'}
              </button>
              <button onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Built-in types */}
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Built-in Types</h2>
            <Lock className="w-3 h-3 text-gray-400" />
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Code</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Description</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Active</th>
                  <th className="px-4 py-2.5 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">Loading…</td></tr>
                ) : builtIn.map(t => (
                  <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${!t.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{t.label}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500 bg-gray-50">{t.code}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{t.description ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => toggleType(t.id, t.isActive)}>
                        {t.isActive
                          ? <ToggleRight className="w-5 h-5 text-blue-500" />
                          : <ToggleLeft className="w-5 h-5 text-gray-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span title="Built-in — cannot be deleted"><Lock className="w-3.5 h-3.5 text-gray-300 inline" /></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Custom types */}
        {(custom.length > 0 || !loading) && (
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Custom Types</h2>
            {custom.length === 0 ? (
              <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 rounded-xl text-sm">
                No custom permit types yet.{' '}
                <button onClick={() => setShowAddForm(true)} className="text-blue-600 hover:underline">Add one</button>.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Type</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Code</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Description</th>
                      <th className="text-center px-4 py-2.5 font-medium text-gray-600 text-xs">Active</th>
                      <th className="px-4 py-2.5 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {custom.map(t => (
                      <tr key={t.id} className={`group hover:bg-gray-50 transition-colors ${!t.isActive ? 'opacity-50' : ''}`}>
                        {editingId === t.id ? (
                          <td colSpan={5} className="px-4 py-3 bg-blue-50">
                            <div className="flex items-center gap-3">
                              <input value={editDraft.label} onChange={e => setEditDraft({ ...editDraft, label: e.target.value })}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40" />
                              <input value={editDraft.description} onChange={e => setEditDraft({ ...editDraft, description: e.target.value })}
                                placeholder="Description"
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1" />
                              <button onClick={() => saveEdit(t.id)} className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                                <Save className="w-3 h-3" />Save
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-700">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="px-4 py-2.5 font-medium text-gray-900">{t.label}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{t.code}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{t.description ?? '—'}</td>
                            <td className="px-4 py-2.5 text-center">
                              <button onClick={() => toggleType(t.id, t.isActive)}>
                                {t.isActive
                                  ? <ToggleRight className="w-5 h-5 text-blue-500" />
                                  : <ToggleLeft className="w-5 h-5 text-gray-300" />}
                              </button>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingId(t.id); setEditDraft({ label: t.label, description: t.description ?? '' }) }}
                                  className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deleteType(t.id)}
                                  className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50">
                                  <X className="w-3.5 h-3.5" />
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
    </div>
  )
}
