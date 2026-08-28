/**
 * Export Profiles Admin Page
 *
 * Manage jurisdiction-specific ZIP export profiles:
 * folder structure templates, file naming patterns, and default profiles.
 */

export const dynamic = 'force-dynamic'

import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus } from 'lucide-react'

const thClass =
  'px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.08em] text-muted'
const tdLinkClass =
  'text-xs font-bold tracking-[0.06em] text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

async function getProfiles() {
  return prisma.exportProfile.findMany({
    include: {
      jurisdiction: { select: { name: true } },
      _count: { select: { exportLogs: true } },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
}

export default async function ExportProfilesPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'admin') redirect('/dashboard')

  const profiles = await getProfiles()

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Export Profiles"
          description="Jurisdiction-specific ZIP assembly templates"
          actions={
            <Link href="/admin/export-profiles/new">
              <Button>
                <Plus className="h-4 w-4 mr-1" /> New Profile
              </Button>
            </Link>
          }
        />

        {profiles.length === 0 ? (
          <section className="border-b border-border py-14 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-border" aria-hidden />
            <p className="font-semibold text-ink">No export profiles yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Create profiles to control how permit packages are zipped for submission.
            </p>
            <div className="mt-5">
              <Link href="/admin/export-profiles/new">
                <Button>Create first profile</Button>
              </Link>
            </div>
          </section>
        ) : (
          <section aria-label="Export profile register" className="pt-5">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
              Register — {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-1 overflow-x-auto">
              <table className="w-full text-sm" aria-label="Export profiles">
                <caption className="sr-only">All jurisdiction export profiles</caption>
                <thead>
                  <tr className="border-b border-border">
                    <th scope="col" className={thClass}>Profile</th>
                    <th scope="col" className={thClass}>Jurisdiction</th>
                    <th scope="col" className={thClass}>Description</th>
                    <th scope="col" className={thClass}>Exports</th>
                    <th scope="col" className={thClass}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profiles.map(profile => (
                    <tr key={profile.id} className="transition-colors hover:bg-surface-inset">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-ink">{profile.name}</span>
                          {profile.isDefault && (
                            <span className="whitespace-nowrap bg-accent-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-accent">
                              Default
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {profile.jurisdiction?.name ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        <span className="line-clamp-2 block max-w-xs">
                          {profile.description || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                        {profile._count.exportLogs} export{profile._count.exportLogs !== 1 ? 's' : ''}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <Link href={`/admin/export-profiles/${profile.id}`} className={tdLinkClass}>
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  )
}
