import Anthropic from '@anthropic-ai/sdk'
import type { Category } from '@/types'

type RawResult = { index: number; category: string }

function isRawResult(val: unknown): val is RawResult {
  return (
    typeof val === 'object' &&
    val !== null &&
    typeof (val as RawResult).index === 'number' &&
    typeof (val as RawResult).category === 'string'
  )
}

export async function categoriseMerchantsWithClaude(
  merchantNames: string[],
  categories: Category[]
): Promise<Map<string, string>> {
  if (merchantNames.length === 0) return new Map()

  const categoryNames = categories.map((c) => c.name).join('\n- ')
  const categoryIdByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

  // Use numeric indices so Claude can't mangle the merchant name when echoing it back.
  const indexedList = merchantNames.map((name, i) => `${i}: ${name}`).join('\n')

  // Use TIDE_ANTHROPIC_API_KEY — Claude for Desktop injects an empty ANTHROPIC_API_KEY on macOS
  const client = new Anthropic({ apiKey: process.env.TIDE_ANTHROPIC_API_KEY! })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a NZ household budget categoriser. Assign each numbered merchant to the best matching category.

Categories (use these names exactly):
- ${categoryNames}

Category guidance:
- "Dining & Takeaways": restaurants, cafes, fast food, food delivery (e.g. Uber Eats, Menulog), any eating out or takeaway order
- "Housing": mortgage repayments, rent, council rates, body corporate fees
- "Income": salary, wages, government payments (e.g. Working for Families, NZ Super), tax refunds, IRD credits

Rules:
- Return exactly one category per merchant
- If genuinely unsure, use "Other"
- Return ONLY a compact JSON array using the merchant's index number — no markdown, no explanation

NZ examples:
Merchants:
0: COUNTDOWN
1: KFC
2: BP 2GO
3: SPARK NZ
4: VIVID WAGES
Output: [{"index":0,"category":"Groceries"},{"index":1,"category":"Dining & Takeaways"},{"index":2,"category":"Fuel"},{"index":3,"category":"Utilities"},{"index":4,"category":"Income"}]

Merchants:
${indexedList}`,
      },
    ],
  })

  const first = response.content[0]
  if (!first || first.type !== 'text') return new Map()

  const raw = first.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error('[categorise] Claude returned invalid JSON:', raw)
    return new Map()
  }

  if (!Array.isArray(parsed)) return new Map()

  const result = new Map<string, string>()
  for (const item of parsed) {
    if (!isRawResult(item)) continue
    const merchantName = merchantNames[item.index]
    if (!merchantName) continue
    const categoryId = categoryIdByName.get(item.category.toLowerCase())
    if (categoryId) {
      result.set(merchantName, categoryId)
    }
  }

  return result
}
