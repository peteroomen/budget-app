import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { currentMonth } from '@/lib/utils/month'
import { getSummaryContext, buildSummaryPrompt } from '@/lib/queries/summary'
import { SummaryMonthSelector } from '@/components/summary/SummaryMonthSelector'
import { SummaryDisplay, type MonthlySummaryJSON } from '@/components/summary/SummaryDisplay'

interface SummaryPageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const { month: monthParam } = await searchParams
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth()

  const ctx = await getSummaryContext(month)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Monthly Summary</h1>
        <SummaryMonthSelector month={month} />
      </div>

      {!ctx.hasTransactions ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
          <p className="text-muted-foreground">No transactions for {ctx.monthLabel}.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Import a statement to generate a summary.
          </p>
        </div>
      ) : (
        <SummaryContent ctx={ctx} />
      )}
    </div>
  )
}

async function SummaryContent({ ctx }: { ctx: Awaited<ReturnType<typeof getSummaryContext>> }) {
  const prompt = buildSummaryPrompt(ctx)

  let summary: MonthlySummaryJSON | null = null
  let parseError: string | null = null

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system:
        'You are a financial analyst for a NZ household. ' +
        'Analyse the provided spending data and return a JSON summary. ' +
        'Be specific, honest, and reference exact NZD amounts. ' +
        'Keep notes concise — one to three sentences each.',
      prompt,
      maxOutputTokens: 1024,
    })

    summary = JSON.parse(text) as MonthlySummaryJSON
  } catch {
    parseError = 'Could not generate summary — please try again.'
  }

  if (parseError || !summary) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {parseError}
      </div>
    )
  }

  return <SummaryDisplay summary={summary} ctx={ctx} />
}
