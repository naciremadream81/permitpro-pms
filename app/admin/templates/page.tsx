/**
 * Admin — Document Templates List
 *
 * Lists all document templates with status filter and quick-action buttons
 * for activate, archive, and delete (draft only).
 */

'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileText, RefreshCw, CheckCircle2, Archive, Trash2, Edit2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'

interface Template {
  id: string
  name: string
  code: string
  description: string | null
  category: string
  status: Status
  version: number
  createdAt: string
}

const STATUS_STYLE: Record<Status, string> = {
  DRAFT:    'bg-gray-100 text-gray-700',
  ACTIVE:   'bg-green-100 text-green-700',
  ARCHIVED: 'bg-orange-100 text-orange-600',
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'ALL',      label: 'All' },
  { value: 'ACTIVE',   label: 'Active' },
  { value: 'DRAFT',    label: 'Drafts' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const CATEGORIES = [
  'All', 'Application', 'Plans', 'Specifications', 'Structural',
  'Electrical', 'Mechanical', 'Correspondence', 'Permit',
  'Inspection', 'Certificate', 'Other',
]

export default function TemplatesListPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (categoryFilter !== 'All') params.set('category', categoryFilter)
    const res = await fetch(`/api/templates?${params}`)
    const json = await res.json()
    setTemplates(json.data ?? [])
    setLoading(false)
  }, [statusFilter, categoryFilter])

  useEffect(() => { load() }, [load])

  async function changeStatus(id: string, status: Status) {
    setActionId(id)
    await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setActionId(null)
    load()
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Delete this draft template? This cannot be undone.')) return
    setActionId(id)
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    setActionId(null)
    load()
  }

  const grouped = templates.reduce<Record<string, Template[]>>((acc, t) => {
    acc[t.category] = [...(acc[t.category] ?? []), t]
    return acc
  }, {})

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              HTML templates with merge fields for correspondence and form letters.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-1.5', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Link href="/admin/templates/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" /> New Template
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Status tabs */}
          <div className="flex rounded-lg border overflow-hidden text-sm">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  'px-3 py-1.5 font-medium transition-colors',
                  statusFilter === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading && (
          <div className="py-12 text-center text-gray-400 animate-pulse">Loading templates…</div>
        )}

        {!loading && templates.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No templates match your filters.</p>
              <Link href="/admin/templates/new" className="mt-3 inline-block">
                <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Create first template</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {!loading && Object.entries(grouped).map(([category, items]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 uppercase tracking-wide">{category}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {items.map(t => (
                  <div key={t.id} className="flex items-start justify-between gap-3 px-6 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm text-gray-900">{t.name}</p>
                        <span className={cn('text-xs rounded-full px-2 py-0.5 font-medium', STATUS_STYLE[t.status])}>
                          {t.status}
                        </span>
                        <span className="text-xs text-gray-400">v{t.version}</span>
                      </div>
                      <p className="text-xs font-mono text-gray-400">{t.code}</p>
                      {t.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Link href={`/admin/templates/${t.id}`}>
                        <Button size="sm" variant="ghost" title="Edit">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href={`/admin/templates/${t.id}?preview=1`}>
                        <Button size="sm" variant="ghost" title="Preview">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      {t.status === 'DRAFT' && (
                        <>
                          <Button
                            size="sm" variant="ghost"
                            title="Activate"
                            onClick={() => changeStatus(t.id, 'ACTIVE')}
                            disabled={actionId === t.id}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            title="Delete draft"
                            onClick={() => deleteTemplate(t.id)}
                            disabled={actionId === t.id}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </>
                      )}
                      {t.status === 'ACTIVE' && (
                        <Button
                          size="sm" variant="ghost"
                          title="Archive"
                          onClick={() => changeStatus(t.id, 'ARCHIVED')}
                          disabled={actionId === t.id}
                        >
                          <Archive className="h-3.5 w-3.5 text-orange-500" />
                        </Button>
                      )}
                      {t.status === 'ARCHIVED' && (
                        <Button
                          size="sm" variant="ghost"
                          title="Restore to draft"
                          onClick={() => changeStatus(t.id, 'DRAFT')}
                          disabled={actionId === t.id}
                        >
                          <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  )
}
