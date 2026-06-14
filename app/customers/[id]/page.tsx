/**
 * Customer Detail Page
 * 
 * Interactive page for viewing and editing a single customer.
 * Includes inline editing of customer information and display of permit packages.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { CustomerDetailClient } from './customer-detail-client'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      permitPackages: {
        include: {
          contractor: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
        orderBy: { openedDate: 'desc' },
      },
    },
  })

  return customer
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const customer = await getCustomer(params.id)

  if (!customer) {
    notFound()
  }

  return (
    <AppLayout>
      <CustomerDetailClient customer={customer} />
    </AppLayout>
  )
}

