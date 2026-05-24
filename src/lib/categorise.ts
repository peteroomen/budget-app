import Anthropic from '@anthropic-ai/sdk'
import type { Category } from '@/types'

type RawResult = { merchant: string; category: string }

function isRawResult(val: unknown): val is RawResult {
  return (
    typeof val === 'object' &&
    val !== null &&
    typeof (val as RawResult).merchant === 'string' &&
    typeof (val as RawResult).category === 'string'
  )
}

/**
 * Calls Claude to categorise a list of normalised merchant names.
 * Returns a map of merchant_name → category_id for all merchants Claude
 * could confidently assign. Merchants Claude couldn't classify are omitted
 * (caller should treat them as uncategorised).
 */
export async function categoriseMerchantsWithClaude(
  merchantNames: string[],
  categories: Category[]
): Promise<Map<string, string>> {
  if (merchantNames.length === 0) return new Map()

  const categoryNames = categories.map((c) => c.name).join('\n- ')
  const nameIndex = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

  const client = new Anthropic()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a NZ household budget categoriser. Assign each bank statement merchant name to the best matching category from the list below.

Categories (use these names exactly):
- ${categoryNames}

Rules:
- Return exactly one category per merchant, chosen from the list above
- If a merchant is clearly income (salary, wages, government payment, tax refund, IRD credit), use "Income"
- If genuinely unsure, use "Other"
- Return ONLY a compact JSON array — no markdown, no code blocks, no explanation

NZ examples:
Input: ["COUNTDOWN", "PAKNSAVE", "KFC", "BP 2GO", "SPARK NZ", "NETFLIX", "VIVID WAGES", "IRD TAXCREDIT", "THE WAREHOUSE"]
Output: [{"merchant":"COUNTDOWN","category":"Groceries"},{"merchant":"PAKNSAVE","category":"Groceries"},{"merchant":"KFC","category":"Takeaways"},{"merchant":"BP 2GO","category":"Fuel"},{"merchant":"SPARK NZ","category":"Utilities"},{"merchant":"NETFLIX","category":"Subscriptions"},{"merchant":"VIVID WAGES","category":"Income"},{"merchant":"IRD TAXCREDIT","category":"Income"},{"merchant":"THE WAREHOUSE","category":"Shopping"}]

Merchants to categorise:
${JSON.stringify(merchantNames)}`,
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
    // eslint-disable-next-line no-console
    console.error('[categorise] Claude returned invalid JSON:', raw)
    return new Map()
  }

  if (!Array.isArray(parsed)) return new Map()

  const result = new Map<string, string>()
  for (const item of parsed) {
    if (!isRawResult(item)) continue
    const categoryId = nameIndex.get(item.category.toLowerCase())
    if (categoryId) {
      result.set(item.merchant, categoryId)
    }
  }

  return result
}
