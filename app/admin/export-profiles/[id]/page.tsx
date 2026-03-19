/**
 * Edit Export Profile Page
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface Jurisdiction { id: string; name: string }

interface Profile {
  id: string
  name: string
  description: string | null
  jurisdictionId: string | null
  isDefault: boolean
  folderStructure: string
}

export default function EditExportProfilePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [jurisdictionId, setJurisdictionId] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [folderStructure, setFolderStructure] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [jsonError, setJsonError] = useState('')

  const load = useCallback(async () => {
    const [pRes, jRes] = await Promise.all([
      fetch(`/api/export-profiles/${id}`),
      fetch('/api/jurisdictions'),
    ])
    const pj = await pRes.json()
    const jj = await jRes.json()
    const p: Profile = pj.data
    setProfile(p)
    setName(p.name)
    setDescription(p.description ?? '')
    setJurisdictionId(p.jurisdictionId ?? '')
    setIsDefault(p.isDefault)
    setFolderStructure(
      p.folderStructure ? JSON.stringify(JSON.parse(p.folderStructure), null, 2) : '[]'
    )
    setJurisdictions(jj.data ?? [])
  }, [id])

  useEffect(() => { load() }, [load])

  function validateJson(val: string) {
    try { JSON.parse(val); setJsonError('') } catch { setJsonError('Invalid JSON') }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (jsonError) return
    setSaving(true)
    setError('')

    const res = await fetch(`/api/export-profiles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description || null,
        jurisdictionId: jurisdictionId || null,
        isDefault,
        folderStructure,
      }),
    })

    if (!res.ok) {
      const j = await res.json()
      setError(j.error ?? 'Failed to save')
      setSaving(false)
      return
    }

    router.push('/admin/export-profiles')
  }

  async function handleDelete() {
    if (!confirm('Delete this export profile? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/export-profiles/${id}`, { method: 'DELETE' })
    router.push('/admin/export-profiles')
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/export-profiles" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
                <select
                  value={jurisdictionId}
                  onChange={e => setJurisdictionId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All jurisdictions (generic)</option>
                  {jurisdictions.map(j => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                  <span className="text-sm font-medium text-gray-700">Set as default for this jurisdiction</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder Structure (JSON)</label>
                <textarea
                  value={folderStructure}
                  onChange={e => { setFolderStructure(e.target.value); validateJson(e.target.value) }}
                  rows={10}
                  spellCheck={false}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {jsonError && <p className="text-xs text-red-600 mt-1">{jsonError}</p>}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving || !!jsonError || !name.trim()}>
                  {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                  Save Changes
                </Button>
                <Link href="/admin/export-profiles">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
