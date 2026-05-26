import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { getChatContext, formatChatContext, currentMonth } from '@/lib/queries/chat-context'

const BASE_SYSTEM_PROMPT = `You are a helpful budget assistant for a New Zealand household.

Your role: help users understand their spending patterns, track progress against budgets, and answer financial questions about their household.

Guidelines:
- Always answer in NZD
- Reference specific transactions, merchants, and amounts from the financial data below when relevant
- Be concise and direct — lead with the number, then the context
- Be honest about uncertainty: flag when data is incomplete, when you're projecting, or when a question is outside what the data can answer
- Do not invent figures — if something isn't in the data, say so
- When comparing periods, use the trend data provided`

export async function POST(req: Request) {
  // Create provider inside the handler so process.env is read at request time.
  // Use TIDE_ANTHROPIC_API_KEY — Claude for Desktop injects an empty
  // ANTHROPIC_API_KEY into the macOS user env which Next.js won't override.
  const anthropic = createAnthropic({
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: process.env.TIDE_ANTHROPIC_API_KEY!,
  })

  const { messages } = (await req.json()) as { messages: UIMessage[] }

  const ctx = await getChatContext(currentMonth())

  const systemPrompt = ctx
    ? `${BASE_SYSTEM_PROMPT}\n\n${formatChatContext(ctx)}`
    : BASE_SYSTEM_PROMPT

  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 2048,
  })

  return result.toUIMessageStreamResponse()
}
