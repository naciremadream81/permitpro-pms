/**
 * Permit Detail Page
 * 
 * Interactive page for viewing and editing a single permit package.
 * Includes inline editing, task management, document management with notes/labels,
 * and comprehensive activity tracking.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { PermitDetailClient } from './permit-detail-client'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

async function getPermit(id: string) {
  const permit = await prisma.permitPackage.findUnique({
    where: { id },
    include: {
      customer: true,
      contractor: true,
      documents: {
        include: {
          uploadedByUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { uploadedAt: 'desc' },
      },
      tasks: {
        orderBy: [
          { status: 'asc' },
          { dueDate: 'asc' },
        ],
      },
      activityLogs: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  return permit
}

export default async function PermitDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const permit = await getPermit(params.id)

  if (!permit) {
    notFound()
  }

  // Convert dates to ISO strings for client component
  const permitData = {
    ...permit,
    openedDate: permit.openedDate.toISOString(),
    targetIssueDate: permit.targetIssueDate?.toISOString() || null,
    closedDate: permit.closedDate?.toISOString() || null,
    sentToBillingAt: permit.sentToBillingAt?.toISOString() || null,
    documents: permit.documents.map(doc => ({
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    })),
    tasks: permit.tasks.map(task => ({
      ...task,
      dueDate: task.dueDate?.toISOString() || null,
      completedAt: task.completedAt?.toISOString() || null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
    activityLogs: permit.activityLogs.map(log => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
  }

  return (
    <AppLayout>
      <PermitDetailClient permit={permitData} />
    </AppLayout>
  )
}
