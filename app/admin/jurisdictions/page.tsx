'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, MapPin, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'

interface Jurisdiction {
  id: string
  name: string
  countyCode: string
  state: string
  isActive: boolean
  notes?: string
  _count: { requirements: number; packages: number }
}

export default function JurisdictionsPage() {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    fetchJurisdictions()
  }, [showInactive])

  async function fetchJurisdictions() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (!showInactive) params.set('isActive', 'true')
      const res = await fetch(`/api/jurisdictions?${params}`)
      const json = await res.json()
      setJurisdictions(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/jurisdictions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    })
    fetchJurisdictions()
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Jurisdictions"
          description="Manage counties and their permit document requirements"
          actions={
            <Link href="/admin/jurisdictions/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Jurisdiction
              </Button>
            </Link>
          }
        />

      {/* Filter */}
      <label className="inline-flex items-center gap-2 text-sm text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="rounded"
        />
        Show inactive
      </label>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : jurisdictions.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No jurisdictions configured</p>
          <p className="text-sm mt-1">Add your first jurisdiction to enable checklist generation.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-inset border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted">County</th>
                <th className="text-left px-4 py-3 font-medium text-muted">Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted">State</th>
                <th className="text-right px-4 py-3 font-medium text-muted">Requirements</th>
                <th className="text-right px-4 py-3 font-medium text-muted">Packages</th>
                <th className="text-center px-4 py-3 font-medium text-muted">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jurisdictions.map((j) => (
                <tr key={j.id} className="hover:bg-surface-inset transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{j.name}</td>
                  <td className="px-4 py-3 text-muted font-mono">{j.countyCode}</td>
                  <td className="px-4 py-3 text-muted">{j.state}</td>
                  <td className="px-4 py-3 text-right text-ink">
                    {j._count.requirements}
                  </td>
                  <td className="px-4 py-3 text-right text-ink">
                    {j._count.packages}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(j.id, j.isActive)}
                      title={j.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {j.isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-success inline" />
                      ) : (
                        <XCircle className="w-4 h-4 text-border inline" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/jurisdictions/${j.id}`}
                      className="inline-flex items-center gap-1 text-accent hover:text-accent-hover text-sm font-medium"
                    >
                      Manage
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </AppLayout>
  )
}
