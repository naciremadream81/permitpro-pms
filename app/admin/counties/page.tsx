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

// A county is "seeded" when it has requirements covering all 9 permit types (≥9)
const SEED_THRESHOLD = 9

function seedStatus(reqCount: number): SeedStatus {
  if (reqCount >= SEED_THRESHOLD) return 'seeded'
  if (reqCount > 0)               return 'partial'
  return 'unseeded'
}

// ── Status display helpers ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<SeedStatus, {
  label: string
  icon: React.ElementType
  tile: string
  badge: string
  dot: string
}> = {
  seeded: {
    label: 'Seeded',
    icon: CheckCircle2,
    tile: 'border-l-emerald-400 bg-white hover:border-l-emerald-500 hover:shadow-emerald-100',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-400',
  },
  partial: {
    label: 'Partial',
    icon: AlertTriangle,
    tile: 'border-l-amber-400 bg-white hover:border-l-amber-500 hover:shadow-amber-100',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-400',
  },
  unseeded: {
    label: 'Unseeded',
    icon: Circle,
    tile: 'border-l-gray-200 bg-gray-50 hover:border-l-gray-400 hover:shadow-gray-100 hover:bg-white',
    badge: 'bg-gray-100 text-gray-500 ring-gray-200',
    dot: 'bg-gray-300',
  },
}

// ── County Tile ──────────────────────────────────────────────────────────────
function CountyTile({ county }: { county: CountyData }) {
  const cfg = STATUS_CONFIG[county.status]
  const href = `/admin/counties/${county.code}`

  return (
    <Link
      href={href}
      className={[
        'group relative flex flex-col gap-2 rounded-lg border border-gray-200 border-l-4 p-4',
        'transition-all duration-150 hover:shadow-md hover:-translate-y-px',
        cfg.tile,
      ].join(' ')}
    >
      {/* County code watermark */}
      <span
        className="pointer-events-none absolute right-3 top-2 font-mono text-2xl font-black tracking-tighter text-gray-100 select-none group-hover:text-gray-150 transition-colors"
        aria-hidden
      >
        {county.code}
      </span>

      <div className="flex items-start justify-between gap-2 relative">
        <span className="text-sm font-semibold text-gray-900 leading-tight">{county.name}</span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-0.5 transition-colors" />
      </div>

      <div className="flex items-center gap-1.5 relative">
        <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ring-1 ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400 relative">
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

// ── Main Page ────────────────────────────────────────────────────────────────
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

  // Build merged county list: all 67 FL counties + jurisdiction data where it exists
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

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Command Header ──────────────────────────────────────────────── */}
      <div className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Counties Module</h1>
                <p className="text-sm text-gray-400 mt-0.5">Florida · 67 counties · Permit checklist management</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/counties/permit-types"
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
              >
                <Settings2 className="h-4 w-4" />
                Permit Types
              </Link>
              <button
                onClick={handleSeedAll}
                disabled={seeding || allSeeded}
                className={[
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
                  allSeeded
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 cursor-default'
                    : 'bg-blue-500 text-white hover:bg-blue-400 active:bg-blue-600 shadow-lg shadow-blue-500/25',
                  seeding ? 'opacity-70 cursor-wait' : '',
                ].join(' ')}
              >
                {seeding ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : seedDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {seeding ? 'Seeding…' : seedDone ? 'Seeded!' : allSeeded ? 'All Counties Seeded' : 'Seed All 67 Counties'}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-5 grid grid-cols-4 gap-3">
            {[
              { label: 'Seeded',   value: seededCount,   color: 'text-emerald-400' },
              { label: 'Partial',  value: partialCount,  color: 'text-amber-400' },
              { label: 'Unseeded', value: unseededCount, color: 'text-red-400' },
              { label: 'Total',    value: 67,            color: 'text-blue-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg bg-white/5 ring-1 ring-white/10 px-4 py-3">
                <div className={`text-2xl font-bold tabular-nums ${color}`}>{loading ? '—' : value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search counties…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={[
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  filter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800',
                ].join(' ')}
              >
                {tab.label}
                <span className={[
                  'rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                  filter === tab.key ? 'bg-gray-100 text-gray-600' : 'text-gray-400',
                ].join(' ')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── County Grid ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pb-12">
        {loading ? (
          // Skeleton
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 67 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg border border-l-4 border-gray-200 border-l-gray-200 bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <MapPin className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium text-gray-600">No counties match</p>
            <p className="text-sm mt-1">Try a different search or filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map(county => (
              <CountyTile key={county.code} county={county} />
            ))}
          </div>
        )}

        {/* Footer note */}
        {!loading && filtered.length > 0 && (
          <p className="mt-6 text-center text-xs text-gray-400">
            Showing {filtered.length} of 67 Florida counties
            {filter !== 'all' && ` · filtered by "${filter}"`}
          </p>
        )}
      </div>
    </div>
  )
}
