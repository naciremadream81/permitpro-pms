/**
 * Contractor Detail Page
 * 
 * Interactive page for viewing and editing a single contractor.
 * Includes inline editing of contractor information and display of permit packages.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { ContractorDetailClient } from './contractor-detail-client'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

async function getContractor(id: string) {
  const contractor = await prisma.contractor.findUnique({
    where: { id },
    include: {
      permitPackages: {
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { openedDate: 'desc' },
      },
    },
  })

  return contractor
}

export default async function ContractorDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const contractor = await getContractor(params.id)

  if (!contractor) {
    notFound()
  }

  // Convert dates to ISO strings for client component
  const contractorData = {
    ...contractor,
    specialties: contractor.specialties || null,
    workersCompExpirationDate: contractor.workersCompExpirationDate
      ? contractor.workersCompExpirationDate.toISOString()
      : null,
    liabilityExpirationDate: contractor.liabilityExpirationDate
      ? contractor.liabilityExpirationDate.toISOString()
      : null,
    permitPackages: contractor.permitPackages.map((pkg) => ({
      ...pkg,
      openedDate: pkg.openedDate.toISOString(),
    })),
  }

  return (
    <AppLayout>
      <ContractorDetailClient contractor={contractorData} />
    </AppLayout>
  )
}

