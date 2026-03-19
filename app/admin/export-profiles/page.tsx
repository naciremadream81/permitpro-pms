/**
 * Export Profiles Admin Page
 *
 * Manage jurisdiction-specific ZIP export profiles:
 * folder structure templates, file naming patterns, and default profiles.
 */

export const dynamic = 'force-dynamic'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, Plus } from 'lucide-react'

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Export Profiles</h1>
            <p className="text-sm text-gray-500 mt-0.5">Jurisdiction-specific ZIP assembly templates</p>
          </div>
          <Button asChild>
            <Link href="/admin/export-profiles/new">
              <Plus className="h-4 w-4 mr-1" /> New Profile
            </Link>
          </Button>
        </div>

        {profiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No export profiles yet</p>
              <p className="text-sm text-gray-400 mt-1">Create profiles to control how permit packages are zipped for submission.</p>
              <Button asChild className="mt-4">
                <Link href="/admin/export-profiles/new">Create first profile</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map(profile => (
              <Card key={profile.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{profile.name}</CardTitle>
                      {profile.jurisdiction && (
                        <p className="text-xs text-gray-500 mt-0.5">{profile.jurisdiction.name}</p>
                      )}
                    </div>
                    {profile.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">Default</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {profile.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{profile.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{profile._count.exportLogs} export{profile._count.exportLogs !== 1 ? 's' : ''}</span>
                    <Link href={`/admin/export-profiles/${profile.id}`} className="text-blue-600 hover:underline">
                      Edit
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
