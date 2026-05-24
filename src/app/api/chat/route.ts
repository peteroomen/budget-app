import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

const SYSTEM_PROMPT =
  'You are a helpful budget assistant for a NZ household. ' +
  'Always respond in NZD. Be concise and grounded — reference specific numbers when relevant. ' +
  'You help two people understand their spending, track budgets, and answer financial questions about their household.'

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: UIMessage[] }

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 2048,
  })

  return result.toUIMessageStreamResponse()
}
