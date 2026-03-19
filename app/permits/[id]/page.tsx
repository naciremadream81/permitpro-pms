/**
 * Permit Detail Page — Phase 2
 *
 * Tabbed layout surfacing Phase 1/2 features:
 * checklist, review workflow, contractor vault, activity log.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { PermitDetailClient } from './permit-detail-client'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'

async function getPermit(id: string) {
  return prisma.permitPackage.findUnique({
    where: { id },
    include: {
      customer: true,
      contractor: true,
      coordinator: { select: { id: true, name: true, email: true } },
      jurisdiction: { select: { id: true, name: true } },
      documents: {
        include: {
          uploadedByUser: { select: { id: true, name: true, email: true } },
        },
        orderBy: { uploadedAt: 'desc' },
      },
      tasks: {
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
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
}

export default async function PermitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [permit, session] = await Promise.all([getPermit(id), getSession()])

  if (!permit) notFound()

  // Serialize dates for client
  const permitData = {
    ...permit,
    openedDate: permit.openedDate.toISOString(),
    targetIssueDate: permit.targetIssueDate?.toISOString() ?? null,
    closedDate: permit.closedDate?.toISOString() ?? null,
    sentToBillingAt: permit.sentToBillingAt?.toISOString() ?? null,
    lastActivityAt: permit.lastActivityAt?.toISOString() ?? null,
    documents: permit.documents.map(doc => ({
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    })),
    tasks: permit.tasks.map(task => ({
      ...task,
      dueDate: task.dueDate?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
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
      <PermitDetailClient
        permit={permitData}
        userRole={session?.user?.role ?? 'coordinator'}
        userId={session?.user?.id ?? ''}
      />
    </AppLayout>
  )
}
