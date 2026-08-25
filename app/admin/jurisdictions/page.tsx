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

const thClass =
  'px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted'
const thClassRight =
  'px-4 py-2 text-right text-xs font-medium uppercase tracking-[0.08em] text-muted'
const thClassCenter =
  'px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.08em] text-muted'
const tdLinkClass =
  'inline-flex items-center gap-1 text-xs font-bold tracking-[0.06em] text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

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
      <div className="mx-auto max-w-5xl">
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

        <div className="flex flex-col gap-3 border-b border-border py-4 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>

        <section aria-label="Jurisdiction register" className="pt-5">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Register — {jurisdictions.length} jurisdiction{jurisdictions.length !== 1 ? 's' : ''}
          </p>

          {loading ? (
            <div className="py-10 text-center text-sm text-muted">Loading…</div>
          ) : jurisdictions.length === 0 ? (
            <div className="flex flex-col items-center justify-center border-b border-border py-16 text-center">
              <MapPin className="mb-3 h-10 w-10 text-muted opacity-30" />
              <p className="font-medium text-ink">No jurisdictions configured</p>
              <p className="mt-1 text-sm text-muted">
                Add your first jurisdiction to enable checklist generation.
              </p>
            </div>
          ) : (
            <div className="mt-1 overflow-x-auto">
              <table className="w-full text-sm" aria-label="Jurisdictions">
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className={thClass}>County</th>
                    <th scope="col" className={thClass}>Code</th>
                    <th scope="col" className={thClass}>State</th>
                    <th scope="col" className={thClassRight}>Requirements</th>
                    <th scope="col" className={thClassRight}>Packages</th>
                    <th scope="col" className={thClassCenter}>Active</th>
                    <th scope="col" className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jurisdictions.map((j) => (
                    <tr key={j.id} className="transition-colors hover:bg-surface-inset">
                      <td className="px-4 py-3 font-bold text-ink">{j.name}</td>
                      <td className="px-4 py-3 font-mono text-muted">{j.countyCode}</td>
                      <td className="px-4 py-3 text-muted">{j.state}</td>
                      <td className="px-4 py-3 text-right text-ink">{j._count.requirements}</td>
                      <td className="px-4 py-3 text-right text-ink">{j._count.packages}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActive(j.id, j.isActive)}
                          title={j.isActive ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {j.isActive ? (
                            <CheckCircle2 className="inline h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="inline h-4 w-4 text-border" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/jurisdictions/${j.id}`} className={tdLinkClass}>
                          Manage
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  )
}
