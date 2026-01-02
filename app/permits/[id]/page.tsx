/**
 * Permit Detail Page
 * 
 * Displays comprehensive information about a single permit package,
 * including overview, tasks, documents, and activity log.
 */

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { formatDate, formatDateTime } from '@/lib/utils'
import Link from 'next/link'
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{permit.projectName}</h1>
            <p className="text-gray-600">{permit.projectAddress}</p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={permit.status} />
            <StatusBadge status={permit.billingStatus} />
          </div>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-500">Customer</p>
                <Link href={`/customers/${permit.customer.id}`} className="text-blue-600 hover:underline">
                  {permit.customer.name}
                </Link>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Contractor</p>
                <Link href={`/contractors/${permit.contractor.id}`} className="text-blue-600 hover:underline">
                  {permit.contractor.companyName}
                </Link>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Permit Type</p>
                <p className="text-sm">{permit.permitType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Permit Number</p>
                <p className="text-sm">{permit.permitNumber || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Opened Date</p>
                <p className="text-sm">{formatDate(permit.openedDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Target Issue Date</p>
                <p className="text-sm">{permit.targetIssueDate ? formatDate(permit.targetIssueDate) : 'Not set'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            {permit.tasks.length > 0 ? (
              <div className="space-y-2">
                {permit.tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{task.name}</p>
                      {task.description && (
                        <p className="text-sm text-gray-600">{task.description}</p>
                      )}
                      {task.assignedTo && (
                        <p className="text-xs text-gray-500">Assigned to: {task.assignedTo}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <StatusBadge status={task.status} />
                      {task.dueDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {formatDate(task.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No tasks</p>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documents ({permit.documents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {permit.documents.length > 0 ? (
              <div className="space-y-2">
                {permit.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{doc.fileName}</p>
                      <p className="text-sm text-gray-600">
                        {doc.category} • {formatDateTime(doc.uploadedAt)} • {doc.uploadedByUser.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={doc.status} />
                      <Link href={`/api/documents/${doc.id}/download`}>
                        <Button variant="outline" size="sm">Download</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No documents</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {permit.activityLogs.map((log) => (
                <div key={log.id} className="border-b pb-2">
                  <p className="text-sm">{log.description}</p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(log.createdAt)} • {log.user?.name || 'System'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

