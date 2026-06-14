'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  MapPin,
  Zap,
  Settings2,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Circle,
  RefreshCw,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── All 67 Florida counties ──────────────────────────────────────────────────
const FL_COUNTIES = [
  { name: 'Alachua',      code: 'ALA' }, { name: 'Baker',        code: 'BAK' },
  { name: 'Bay',          code: 'BAY' }, { name: 'Bradford',     code: 'BRA' },
  { name: 'Brevard',      code: 'BRE' }, { name: 'Broward',      code: 'BRO' },
  { name: 'Calhoun',      code: 'CAL' }, { name: 'Charlotte',    code: 'CHA' },
  { name: 'Citrus',       code: 'CIT' }, { name: 'Clay',         code: 'CLA' },
  { name: 'Collier',      code: 'COL' }, { name: 'Columbia',     code: 'CLM' },
  { name: 'DeSoto',       code: 'DES' }, { name: 'Dixie',        code: 'DIX' },
  { name: 'Duval',        code: 'DUV' }, { name: 'Escambia',     code: 'ESC' },
  { name: 'Flagler',      code: 'FLA' }, { name: 'Franklin',     code: 'FRK' },
  { name: 'Gadsden',      code: 'GAD' }, { name: 'Gilchrist',    code: 'GIL' },
  { name: 'Glades',       code: 'GLA' }, { name: 'Gulf',         code: 'GUL' },
  { name: 'Hamilton',     code: 'HAM' }, { name: 'Hardee',       code: 'HAR' },
  { name: 'Hendry',       code: 'HEN' }, { name: 'Hernando',     code: 'HER' },
  { name: 'Highlands',    code: 'HIG' }, { name: 'Hillsborough', code: 'HIL' },
  { name: 'Holmes',       code: 'HOL' }, { name: 'Indian River', code: 'IND' },
  { name: 'Jackson',      code: 'JAC' }, { name: 'Jefferson',    code: 'JEF' },
  { name: 'Lafayette',    code: 'LAF' }, { name: 'Lake',         code: 'LAK' },
  { name: 'Lee',          code: 'LEE' }, { name: 'Leon',         code: 'LEO' },
  { name: 'Levy',         code: 'LEV' }, { name: 'Liberty',      code: 'LIB' },
  { name: 'Madison',      code: 'MAD' }, { name: 'Manatee',      code: 'MAN' },
  { name: 'Marion',       code: 'MAR' }, { name: 'Martin',       code: 'MTN' },
  { name: 'Miami-Dade',   code: 'MIA' }, { name: 'Monroe',       code: 'MON' },
  { name: 'Nassau',       code: 'NAS' }, { name: 'Okaloosa',     code: 'OKA' },
  { name: 'Okeechobee',   code: 'OKE' }, { name: 'Orange',       code: 'ORA' },
  { name: 'Osceola',      code: 'OSC' }, { name: 'Palm Beach',   code: 'PAL' },
  { name: 'Pasco',        code: 'PAS' }, { name: 'Pinellas',     code: 'PIN' },
  { name: 'Polk',         code: 'POL' }, { name: 'Putnam',       code: 'PUT' },
  { name: 'Santa Rosa',   code: 'SAN' }, { name: 'Sarasota',     code: 'SAR' },
  { name: 'Seminole',     code: 'SEM' }, { name: 'St. Johns',    code: 'STJ' },
  { name: 'St. Lucie',    code: 'STL' }, { name: 'Sumter',       code: 'SUM' },
  { name: 'Suwannee',     code: 'SUW' }, { name: 'Taylor',       code: 'TAY' },
  { name: 'Union',        code: 'UNI' }, { name: 'Volusia',      code: 'VOL' },
  { name: 'Wakulla',      code: 'WAK' }, { name: 'Walton',       code: 'WAL' },
  { name: 'Washington',   code: 'WAS' },
] as const

type SeedStatus = 'seeded' | 'partial' | 'unseeded'

interface CountyData {
  name: string
  code: string
  jurisdictionId?: string
  requirementCount: number
  packageCount: number
  status: SeedStatus
}

interface JurisdictionAPI {
  id: string
  name: string
  countyCode: string
  isActive: boolean
  _count: { requirements: number; packages: number }
}

type FilterTab = 'all' | 'seeded' | 'partial' | 'unseeded'

const SEED_THRESHOLD = 9

function seedStatus(reqCount: number): SeedStatus {
  if (reqCount >= SEED_THRESHOLD) return 'seeded'
  if (reqCount > 0)               return 'partial'
  return 'unseeded'
}

const STATUS_CONFIG: Record<SeedStatus, {
  label: string
  icon: React.ElementType
  tile: string
  badge: string
  dot: string
  stat: string
}> = {
  seeded: {
    label: 'Seeded',
    icon: CheckCircle2,
    tile: 'border-border bg-surface hover:border-accent/30 hover:bg-accent-muted/50',
    badge: 'bg-surface text-success ring-1 ring-success',
    dot: 'bg-success',
    stat: 'text-success',
  },
  partial: {
    label: 'Partial',
    icon: AlertTriangle,
    tile: 'border-border bg-surface hover:border-warning hover:bg-surface-inset',
    badge: 'bg-surface text-warning ring-1 ring-warning',
    dot: 'bg-warning',
    stat: 'text-warning',
  },
  unseeded: {
    label: 'Unseeded',
    icon: Circle,
    tile: 'border-border bg-surface-inset hover:border-border hover:bg-surface',
    badge: 'bg-surface-inset text-muted ring-1 ring-border',
    dot: 'bg-muted',
    stat: 'text-muted',
  },
}

function CountyTile({ county }: { county: CountyData }) {
  const cfg = STATUS_CONFIG[county.status]
  const href = `/admin/counties/${county.code}`

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col gap-2 rounded-lg border p-4',
        'transition-colors duration-150',
        cfg.tile
      )}
    >
      <span
        className="pointer-events-none absolute right-3 top-2 select-none font-mono text-2xl font-black tracking-tighter text-border transition-colors group-hover:text-muted/30"
        aria-hidden
      >
        {county.code}
      </span>

      <div className="relative flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-tight text-ink">{county.name}</span>
        <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted transition-colors group-hover:text-ink" />
      </div>

      <div className="relative flex items-center gap-1.5">
        <span className={cn('inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full', cfg.dot)} />
        <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', cfg.badge)}>
          {cfg.label}
        </span>
      </div>

      <div className="relative flex items-center gap-3 text-xs text-muted">
        {county.requirementCount > 0 ? (
          <span>{county.requirementCount} req.</span>
        ) : (
          <span className="italic">No requirements</span>
        )}
        {county.packageCount > 0 && (
          <span>{county.packageCount} pkg{county.packageCount !== 1 ? 's' : ''}</span>
        )}
      </div>
    </Link>
  )
}

export default function CountiesPage() {
  const [jurisdictions, setJurisdictions] = useState<JurisdictionAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [seedDone, setSeedDone] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')

  useEffect(() => { fetchJurisdictions() }, [])

  async function fetchJurisdictions() {
    setLoading(true)
    try {
      const res = await fetch('/api/jurisdictions?state=FL')
      const json = await res.json()
      setJurisdictions(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleSeedAll() {
    if (!confirm('Seed all 67 Florida counties with standard permit checklists? Existing requirements will not be overwritten.')) return
    setSeeding(true)
    setSeedDone(false)
    try {
      await fetch('/api/admin/counties/seed', { method: 'POST' })
      await fetchJurisdictions()
      setSeedDone(true)
      setTimeout(() => setSeedDone(false), 4000)
    } finally {
      setSeeding(false)
    }
  }

  const counties: CountyData[] = useMemo(() => {
    const byCode = new Map(jurisdictions.map(j => [j.countyCode, j]))
    return FL_COUNTIES.map(({ name, code }) => {
      const j = byCode.get(code)
      const reqCount = j?._count.requirements ?? 0
      return {
        name,
        code,
        jurisdictionId: j?.id,
        requirementCount: reqCount,
        packageCount: j?._count.packages ?? 0,
        status: seedStatus(reqCount),
      }
    })
  }, [jurisdictions])

  const seededCount  = counties.filter(c => c.status === 'seeded').length
  const partialCount = counties.filter(c => c.status === 'partial').length
  const unseededCount = counties.filter(c => c.status === 'unseeded').length
  const allSeeded    = unseededCount === 0 && partialCount === 0

  const filtered = useMemo(() => {
    return counties.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(query.toLowerCase()) ||
                            c.code.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === 'all' || c.status === filter
      return matchesSearch && matchesFilter
    })
  }, [counties, query, filter])

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',      label: 'All',      count: 67 },
    { key: 'seeded',   label: 'Seeded',   count: seededCount },
    { key: 'partial',  label: 'Partial',  count: partialCount },
    { key: 'unseeded', label: 'Unseeded', count: unseededCount },
  ]

  const STATS = [
    { label: 'Seeded', value: seededCount, color: STATUS_CONFIG.seeded.stat },
    { label: 'Partial', value: partialCount, color: STATUS_CONFIG.partial.stat },
    { label: 'Unseeded', value: unseededCount, color: STATUS_CONFIG.unseeded.stat },
    { label: 'Total', value: 67, color: 'text-ink' },
  ]

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Counties"
          description="Florida · 67 counties · Permit checklist management"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/admin/counties/permit-types">
                <Button variant="outline" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Permit Types
                </Button>
              </Link>
              <Button
                onClick={handleSeedAll}
                disabled={seeding || allSeeded}
                className="gap-2"
              >
                {seeding ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : seedDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {seeding ? 'Seeding…' : seedDone ? 'Seeded!' : allSeeded ? 'All Counties Seeded' : 'Seed All 67 Counties'}
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-border bg-surface px-4 py-3">
              <div className={cn('text-2xl font-semibold tabular-nums', color)}>
                {loading ? '—' : value}
              </div>
              <div className="mt-0.5 text-xs text-muted">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              placeholder="Search counties…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pp-input pl-9"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-surface-inset p-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === tab.key
                    ? 'bg-surface text-ink border border-ink'
                    : 'text-muted hover:text-ink'
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                    filter === tab.key ? 'bg-surface-inset text-muted' : 'text-muted/70'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg border border-border bg-surface-inset"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24 text-muted">
            <MapPin className="mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium text-ink">No counties match</p>
            <p className="mt-1 text-sm">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map(county => (
              <CountyTile key={county.code} county={county} />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="text-center text-xs text-muted">
            Showing {filtered.length} of 67 Florida counties
            {filter !== 'all' && ` · filtered by "${filter}"`}
          </p>
        )}
      </div>
    </AppLayout>
  )
}
