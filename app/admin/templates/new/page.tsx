/**
 * Admin — New Document Template
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react'

const CATEGORIES = [
  'Application', 'Plans', 'Specifications', 'Structural', 'Electrical',
  'Mechanical', 'Correspondence', 'Permit', 'Inspection', 'Certificate', 'Other',
]

const MERGE_FIELD_GROUPS = [
  {
    label: 'Date Helpers',
    fields: ['{{today}}', '{{today+7}}', '{{today+30}}'],
  },
  {
    label: 'Permit / Package',
    fields: [
      '{{permit.projectName}}', '{{permit.projectAddress}}', '{{permit.county}}',
      '{{permit.permitType}}', '{{permit.permitNumber}}', '{{permit.status}}',
      '{{permit.openedDate}}', '{{permit.targetIssueDate}}',
    ],
  },
  {
    label: 'Customer',
    fields: ['{{customer.name}}', '{{customer.email}}', '{{customer.phone}}'],
  },
  {
    label: 'Contractor',
    fields: ['{{contractor.companyName}}', '{{contractor.licenseNumber}}'],
  },
  {
    label: 'Other',
    fields: ['{{coordinator.name}}', '{{jurisdiction.name}}'],
  },
]

function insertAtCursor(textareaId: string, text: string) {
  const el = document.getElementById(textareaId) as HTMLTextAreaElement | null
  if (!el) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const before = el.value.substring(0, start)
  const after  = el.value.substring(end)
  el.value = before + text + after
  el.selectionStart = el.selectionEnd = start + text.length
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.focus()
}

export default function NewTemplatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    category: 'Correspondence',
    content: '<p>Dear {{customer.name}},</p>\n\n<p></p>\n\n<p>Sincerely,<br>{{coordinator.name}}</p>',
    mergeFields: '[]',
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE',
  })

  function deriveCode(name: string) {
    return name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to create template')
      setSaving(false)
      return
    }

    const json = await res.json()
    router.push(`/admin/templates/${json.data.id}`)
  }

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/templates">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Templates</Button>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">New Document Template</h1>
        </div>

        {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={save}>
          <div className="grid grid-cols-3 gap-5">
            {/* Left: meta fields */}
            <div className="col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Template Name *</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value, code: deriveCode(e.target.value) }))}
                      placeholder="e.g. Hillsborough Application Letter"
                      className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Code * <span className="text-gray-400 font-normal">(immutable)</span></label>
                    <input
                      required
                      type="text"
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                      placeholder="HILLSBOROUGH_APP_LETTER"
                      className="w-full border rounded-lg px-2.5 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Uppercase letters, digits, underscores.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      required
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                      placeholder="When to use this template…"
                      className="w-full border rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Initial Status</label>
                    <div className="flex gap-2">
                      {(['DRAFT', 'ACTIVE'] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, status: s }))}
                          className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                            form.status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Merge field palette */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Merge Fields</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-gray-400">Click to insert at cursor in the editor.</p>
                  {MERGE_FIELD_GROUPS.map(group => (
                    <div key={group.label}>
                      <p className="text-xs font-medium text-gray-500 mb-1">{group.label}</p>
                      <div className="flex flex-wrap gap-1">
                        {group.fields.map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => insertAtCursor('template-content', f)}
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

            {/* Right: content editor */}
            <div className="col-span-2">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 flex-row items-center justify-between">
                  <CardTitle className="text-sm">Template Content (HTML)</CardTitle>
                  <button
                    type="button"
                    onClick={() => setPreview(p => !p)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {preview ? 'Edit' : 'Preview'}
                  </button>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {preview ? (
                    <div
                      className="flex-1 border rounded-lg p-4 text-sm prose prose-sm max-w-none overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: form.content }}
                    />
                  ) : (
                    <textarea
                      id="template-content"
                      required
                      value={form.content}
                      onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                      className="flex-1 w-full border rounded-lg px-3 py-2.5 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ minHeight: '480px' }}
                      placeholder="<p>Enter HTML content with {{merge.fields}}…</p>"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button type="submit" disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? 'Saving…' : 'Create Template'}
            </Button>
            <Link href="/admin/templates">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
