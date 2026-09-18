import Anthropic from '@anthropic-ai/sdk'
import type { Category } from '@/types'

type RawResult = { index: number; category: string }

function isRawResult(val: unknown): val is RawResult {
  return (
    typeof val === 'object' &&
    val !== null &&
    Number.isInteger((val as RawResult).index) &&
    typeof (val as RawResult).index === 'number' &&
    typeof (val as RawResult).category === 'string'
  )
}

export async function categoriseMerchantsWithClaude(
  merchantNames: string[],
  categories: Category[]
): Promise<Map<string, string>> {
  if (merchantNames.length === 0) return new Map()
  if (merchantNames.length > 100) {
    const combined = new Map<string, string>()
    for (let i = 0; i < merchantNames.length; i += 100) {
      const batch = await categoriseMerchantsWithClaude(merchantNames.slice(i, i + 100), categories)
      for (const [merchant, category] of batch) combined.set(merchant, category)
    }
    return combined
  }

  const categoryNames = categories.map((c) => c.name).join('\n- ')
  const categoryIdByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

  // Use numeric indices so Claude can't mangle the merchant name when echoing it back.
  const indexedList = merchantNames.map((name, i) => `${i}: ${name}`).join('\n')

  // Prefer TIDE_ANTHROPIC_API_KEY (Claude Desktop shadows ANTHROPIC_API_KEY with empty on macOS);
  // fall back to ANTHROPIC_API_KEY for Vercel production where only the standard name is set.
  const client = new Anthropic({
    apiKey: process.env.TIDE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  })
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
- "Savings Transfer": transfers from a spending account to your own savings/investment accounts (e.g. "TRANSFER TO SAVINGS", "TO 12-3456-7890123-00 SAVINGS", "INVESTACC")

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
5: TRANSFER TO SAVINGS
Output: [{"index":0,"category":"Groceries"},{"index":1,"category":"Dining & Takeaways"},{"index":2,"category":"Fuel"},{"index":3,"category":"Utilities"},{"index":4,"category":"Income"},{"index":5,"category":"Savings Transfer"}]

Merchants:
${indexedList}`,
      },
    ],
  })

  if (response.stop_reason !== 'end_turn') throw new Error('Incomplete categorisation')
  const first = response.content[0]
  if (!first || first.type !== 'text') throw new Error('Invalid categorisation response')

  const raw = first.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Invalid categorisation response')
  }

  if (!Array.isArray(parsed)) throw new Error('Invalid categorisation response')

  const result = new Map<string, string>()
  for (const item of parsed) {
    if (!isRawResult(item)) throw new Error('Invalid categorisation response')
    const merchantName = merchantNames[item.index]
    if (!merchantName) continue
    const categoryId = categoryIdByName.get(item.category.toLowerCase())
    if (categoryId) {
      result.set(merchantName, categoryId)
    }
  }

  if (result.size !== merchantNames.length) throw new Error('Incomplete categorisation')
  return result
}
