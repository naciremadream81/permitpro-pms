import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { streamText } from '@/lib/ai-provider'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { permitId } = await req.json() as { permitId: string }
  if (!permitId) return new Response('permitId required', { status: 400 })

  const pkg = await prisma.permitPackage.findUnique({
    where: { id: permitId },
    include: {
      customer: { select: { name: true } },
      contractor: { select: { companyName: true, licenseNumber: true } },
      jurisdiction: { select: { name: true, countyCode: true } },
      documents: {
        select: { fileName: true, category: true, status: true, isVerified: true, isRequired: true },
      },
      checklistItems: {
        include: {
          requirement: { select: { documentName: true, documentCategory: true, description: true } },
        },
      },
      tasks: {
        select: { name: true, status: true, dueDate: true },
        where: { status: { not: 'Completed' } },
      },
    },
  })

  if (!pkg) return new Response('Not found', { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = pkg as any

  const checklistSummary = p.checklistItems?.map((item: {
    status: string
    documentId: string | null
    requirement: { documentName: string; documentCategory: string } | null
  }) => ({
    requirement: item.requirement?.documentName ?? 'Unknown',
    category: item.requirement?.documentCategory ?? '',
    status: item.status,
    hasDocument: !!item.documentId,
  })) ?? []

  const docSummary = p.documents?.map((d: {
    fileName: string; category: string; status: string; isVerified: boolean; isRequired: boolean
  }) => ({
    file: d.fileName,
    category: d.category,
    status: d.status,
    verified: d.isVerified,
    required: d.isRequired,
  })) ?? []

  const openTasks = p.tasks?.map((t: { name: string; status: string; dueDate: Date | null }) => ({
    name: t.name,
    status: t.status,
    due: t.dueDate,
  })) ?? []

  const jurisdictionLabel = p.jurisdiction
    ? `${p.jurisdiction.name} (${p.jurisdiction.countyCode})`
    : 'Not assigned'

  const permitContext = JSON.stringify(
    {
      permitType: pkg.permitType,
      status: pkg.status,
      internalStage: pkg.internalStage,
      jurisdiction: jurisdictionLabel,
      customer: p.customer?.name ?? '',
      contractor: p.contractor?.companyName ?? '',
      contractorLicense: p.contractor?.licenseNumber ?? 'Not on file',
      projectName: pkg.projectName,
      projectAddress: pkg.projectAddress,
      checklist: checklistSummary,
      documents: docSummary,
      openTasks,
    },
    null,
    2
  )

  const system = `You are a permit package compliance reviewer for a permit expeditor firm.
Your job is to audit a permit package and produce a clear, structured report.

Format your response in three sections using markdown:

## ✅ What looks good
Brief bullets of completed / verified items.

## ⚠️ Issues & gaps
Specific problems: missing required documents, checklist items still PENDING, unverified uploads, open blockers, or contractor compliance gaps. Each bullet should say WHAT is missing and WHY it matters.

## 📋 Recommended next steps
Ordered list of the 3–5 most important actions to move this package forward.

Be concise and specific. Use the actual document names and requirement names from the data. Do not hallucinate requirements that are not in the checklist.`

  const userMessage = `Please review this permit package and identify what is complete, what is missing, and what the team should do next.\n\n${permitContext}`

  try {
    const textStream = await streamText({
      system,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 1200,
    })

    const sseStream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder()
        const reader = textStream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              controller.enqueue(enc.encode('data: [DONE]\n\n'))
              break
            }
            controller.enqueue(enc.encode(`data: ${JSON.stringify(value)}\n\n`))
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[AI validate]', err)
    return new Response('AI error', { status: 500 })
  }
}
