/**
 * AI Provider abstraction — supports Anthropic Claude and Google Gemini.
 *
 * Set AI_PROVIDER=anthropic (default) or AI_PROVIDER=gemini in your .env.
 * The underlying model is picked per-provider but can be overridden via
 * ANTHROPIC_MODEL / GEMINI_MODEL env vars.
 */

import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export type AIProvider = 'anthropic' | 'gemini'

export function getProvider(): AIProvider {
  const p = process.env.AI_PROVIDER ?? 'anthropic'
  if (p !== 'anthropic' && p !== 'gemini') return 'anthropic'
  return p
}

// ── Anthropic ────────────────────────────────────────────────────────────────

let _anthropic: Anthropic | null = null
export function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'

// ── Gemini ────────────────────────────────────────────────────────────────────

let _gemini: GoogleGenerativeAI | null = null
export function getGeminiClient(): GoogleGenerativeAI {
  if (!_gemini) {
    _gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? '')
  }
  return _gemini
}

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

// ── Streaming helpers ─────────────────────────────────────────────────────────

export interface StreamParams {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  maxTokens?: number
  /** Enable web search (Anthropic: built-in tool; Gemini: grounding) */
  webSearch?: boolean
}

/**
 * Returns a ReadableStream of text chunks using whichever provider is active.
 * The stream emits raw text deltas — callers wrap them in SSE as needed.
 */
export async function streamText(params: StreamParams): Promise<ReadableStream<string>> {
  const provider = getProvider()
  if (provider === 'gemini') return streamGemini(params)
  return streamAnthropic(params)
}

async function streamAnthropic(params: StreamParams): Promise<ReadableStream<string>> {
  const client = getAnthropicClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] = params.webSearch
    ? [{ type: 'web_search_20250305', name: 'web_search' }]
    : []

  const stream = await client.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: params.maxTokens ?? 1500,
    system: params.system,
    messages: params.messages,
    ...(tools.length > 0 ? { tools } : {}),
  } as Parameters<typeof client.messages.stream>[0])

  return new ReadableStream<string>({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(chunk.delta.text)
        }
      }
      controller.close()
    },
    cancel() {
      stream.controller.abort()
    },
  })
}

async function streamGemini(params: StreamParams): Promise<ReadableStream<string>> {
  const client = getGeminiClient()

  const modelConfig: Parameters<GoogleGenerativeAI['getGenerativeModel']>[0] = {
    model: GEMINI_MODEL,
    systemInstruction: params.system,
  }

  if (params.webSearch) {
    // @ts-expect-error - tools type varies by SDK version
    modelConfig.tools = [{ googleSearch: {} }]
  }

  const model = client.getGenerativeModel(modelConfig)

  const history = params.messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const lastMessage = params.messages[params.messages.length - 1]

  const chat = model.startChat({ history })
  const result = await chat.sendMessageStream(lastMessage.content)

  return new ReadableStream<string>({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) controller.enqueue(text)
      }
      controller.close()
    },
  })
}
