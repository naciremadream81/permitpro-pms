/**
 * Admin — Edit / Preview Document Template
 *
 * ?preview=1 opens straight to the preview tab.
 */

'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  ArrowLeft, Save, Eye, EyeOff, CheckCircle2, Archive, Trash2,
  RefreshCw, Loader2, Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  'Application', 'Plans', 'Specifications', 'Structural', 'Electrical',
  'Mechanical', 'Correspondence', 'Permit', 'Inspection', 'Certificate', 'Other',
]

const MERGE_FIELD_GROUPS = [
  { label: 'Date', fields: ['{{today}}', '{{today+7}}', '{{today+30}}'] },
  { label: 'Permit', fields: ['{{permit.projectName}}', '{{permit.projectAddress}}', '{{permit.county}}', '{{permit.permitType}}', '{{permit.permitNumber}}', '{{permit.openedDate}}', '{{permit.targetIssueDate}}'] },
  { label: 'Customer', fields: ['{{customer.name}}', '{{customer.email}}', '{{customer.phone}}'] },
  { label: 'Contractor', fields: ['{{contractor.companyName}}', '{{contractor.licenseNumber}}'] },
  { label: 'Other', fields: ['{{coordinator.name}}', '{{jurisdiction.name}}'] },
]

function insertAtCursor(textareaId: string, text: string) {
  const el = document.getElementById(textareaId) as HTMLTextAreaElement | null
  if (!el) return
  const start = el.selectionStart
  const after  = el.value.substring(el.selectionEnd)
  el.value = el.value.substring(0, start) + text + after
  el.selectionStart = el.selectionEnd = start + text.length
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.focus()
}

interface Template {
  id: string
  name: string
  code: string
  description: string | null
  category: string
  content: string
  mergeFields: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  version: number
  createdAt: string
  updatedAt: string
}

type ActiveTab = 'edit' | 'preview' | 'render'

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<ActiveTab>(searchParams.get('preview') === '1' ? 'preview' : 'edit')

  // Render test state
  const [renderPackageId, setRenderPackageId] = useState('')
  const [rendered, setRendered] = useState('')
  const [rendering, setRendering] = useState(false)

  // Form state (mirrors template)
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    content: '',
    status: 'DRAFT' as Template['status'],
  })

  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then(r => r.json())
      .then(json => {
        const t: Template = json.data
        setTemplate(t)
        setForm({ name: t.name, description: t.description ?? '', category: t.category, content: t.content, status: t.status })
        setLoading(false)
      })
  }, [id])

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: val }))
    setDirty(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { const j = await res.json(); setError(j.error ?? 'Failed'); setSaving(false); return }
    const j = await res.json()
    setTemplate(j.data)
    setDirty(false)
    setSaving(false)
  }

  async function setStatus(status: Template['status']) {
    const res = await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { const j = await res.json(); setTemplate(j.data); setForm(f => ({ ...f, status })) }
  }

  async function deleteTemplate() {
    if (!confirm(template?.status === 'DRAFT' ? 'Delete this draft?' : 'Archive this template?')) return
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) router.push('/admin/templates')
  }

  async function testRender() {
    setRendering(true)
    const res = await fetch(`/api/templates/${id}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: renderPackageId || undefined }),
    })
    const j = await res.json()
    setRendered(j.data?.rendered ?? j.error ?? 'Error')
    setRendering(false)
  }

  if (loading) return <AppLayout><div className="py-12 text-center text-gray-400 animate-pulse">Loading…</div></AppLayout>
  if (!template) return <AppLayout><div className="py-12 text-center text-red-500">Template not found.</div></AppLayout>

  const STATUS_STYLE: Record<Template['status'], string> = {
    DRAFT:    'bg-gray-100 text-gray-700',
    ACTIVE:   'bg-green-100 text-green-700',
    ARCHIVED: 'bg-orange-100 text-orange-600',
  }

  return (
    <AppLayout>
      <div className="max-w-5xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin/templates">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Templates</Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{template.name}</h1>
                <span className={cn('text-xs rounded-full px-2 py-0.5 font-medium', STATUS_STYLE[template.status])}>
                  {template.status}
                </span>
                <span className="text-xs text-gray-400">v{template.version}</span>
              </div>
              <p className="text-xs font-mono text-gray-400 mt-0.5">{template.code}</p>
            </div>
          </div>

          {/* Status actions */}
          <div className="flex gap-1.5 flex-shrink-0">
            {template.status === 'DRAFT' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setStatus('ACTIVE')}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate
              </Button>
            )}
            {template.status === 'ACTIVE' && (
              <Button size="sm" variant="outline" className="border-orange-300 text-orange-700" onClick={() => setStatus('ARCHIVED')}>
                <Archive className="h-3.5 w-3.5 mr-1" /> Archive
              </Button>
            )}
            {template.status === 'ARCHIVED' && (
              <Button size="sm" variant="outline" onClick={() => setStatus('DRAFT')}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restore to Draft
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={deleteTemplate}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        {/* Tabs */}
        <div className="border-b flex gap-0">
          {(['edit', 'preview', 'render'] as ActiveTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-5 py-2.5 text-sm font-medium border-b-2 -mb-px capitalize transition-colors',
                tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t === 'edit' && <><EyeOff className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />Edit</>}
              {t === 'preview' && <><Eye className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />Preview</>}
              {t === 'render' && <><Play className="h-3.5 w-3.5 inline mr-1 -mt-0.5" />Test Render</>}
            </button>
          ))}
        </div>

        {/* Edit tab */}
        {tab === 'edit' && (
          <form onSubmit={save}>
            <div className="grid grid-cols-3 gap-5">
              {/* Meta */}
              <div className="col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                      <input required type="text" value={form.name} onChange={e => update('name', e.target.value)} className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Code <span className="text-gray-400 font-normal">(immutable)</span></label>
                      <p className="font-mono text-sm text-gray-600 bg-gray-50 border rounded-lg px-2.5 py-1.5">{template.code}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                      <select value={form.category} onChange={e => update('category', e.target.value)} className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                      <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} className="w-full border rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Merge field palette */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Merge Fields</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-gray-400">Click to insert at cursor.</p>
                    {MERGE_FIELD_GROUPS.map(group => (
                      <div key={group.label}>
                        <p className="text-xs font-medium text-gray-500 mb-1">{group.label}</p>
                        <div className="flex flex-wrap gap-1">
                          {group.fields.map(f => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => insertAtCursor('template-content-edit', f)}
                              className="text-xs font-mono bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 hover:bg-indigo-100 transition-colors"
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Content editor */}
              <div className="col-span-2">
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-sm">Template Content (HTML)</CardTitle></CardHeader>
                  <CardContent>
                    <textarea
                      id="template-content-edit"
                      required
                      value={form.content}
                      onChange={e => update('content', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ minHeight: '520px' }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Button type="submit" disabled={saving || !dirty}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {dirty ? 'Save Changes' : 'Saved'}
              </Button>
              <Link href="/admin/templates"><Button variant="outline">Cancel</Button></Link>
              {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
            </div>
          </form>
        )}

        {/* Preview tab */}
        {tab === 'preview' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Preview — merge fields shown unresolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="prose prose-sm max-w-none border rounded-lg p-6 bg-white"
                dangerouslySetInnerHTML={{ __html: form.content }}
              />
            </CardContent>
          </Card>
        )}

        {/* Test Render tab */}
        {tab === 'render' && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Test Render</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-3">
                  Enter a Package ID to auto-populate merge fields from a real permit package, then click Render.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={renderPackageId}
                    onChange={e => setRenderPackageId(e.target.value)}
                    placeholder="Package ID (optional)"
                    className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button onClick={testRender} disabled={rendering}>
                    {rendering ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                    Render
                  </Button>
                </div>
              </CardContent>
            </Card>

            {rendered && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Rendered Output</CardTitle></CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none border rounded-lg p-6 bg-white"
                    dangerouslySetInnerHTML={{ __html: rendered }}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
