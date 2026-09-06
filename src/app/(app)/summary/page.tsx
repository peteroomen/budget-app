import { parseSummary } from '@/lib/finance/summary-schema'
import { isValidMonth } from '@/lib/utils/month'
import { Suspense } from 'react'
import { generateText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { currentMonth } from '@/lib/utils/month'
import { getSummaryContext, buildSummaryPrompt } from '@/lib/queries/summary'
import { SummaryDisplay, type MonthlySummaryJSON } from '@/components/summary/SummaryDisplay'
import { Skeleton } from '@/components/ui/skeleton'

interface SummaryPageProps {
  searchParams: Promise<{ month?: string }>
}

function SummaryLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
      <Skeleton className="h-32 rounded-lg" />
    </div>
  )
}

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const { month: monthParam } = await searchParams
  const month = monthParam && isValidMonth(monthParam) ? monthParam : currentMonth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-summary-h1 font-medium">Monthly recap</h1>
        <p className="mt-0.5 font-display italic text-body-sm text-muted-foreground">
          {new Date().toLocaleDateString('en-NZ', {
            timeZone: 'Pacific/Auckland',
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}{' '}
          · powered by Tide
        </p>
      </div>

      <Suspense key={month} fallback={<SummaryLoadingSkeleton />}>
        <SummaryContent month={month} />
      </Suspense>
    </div>
  )
}

async function SummaryContent({ month }: { month: string }) {
  const ctx = await getSummaryContext(month)

  if (!ctx.hasTransactions) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
        <p className="text-muted-foreground">No transactions for {ctx.monthLabel}.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Import a statement to generate a summary.
        </p>
      </div>
    )
  }

  const prompt = buildSummaryPrompt(ctx)

  // Prefer TIDE_ANTHROPIC_API_KEY (Claude Desktop shadows ANTHROPIC_API_KEY with empty on macOS);
  // fall back to ANTHROPIC_API_KEY for Vercel production where only the standard name is set.
  const anthropic = createAnthropic({
    baseURL: 'https://api.anthropic.com/v1',
    apiKey: (process.env.TIDE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY)!,
  })

  let summary: MonthlySummaryJSON | null = null
  let parseError: string | null = null

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-5'),
      system:
        'You are a financial analyst for a NZ household. ' +
        'Analyse the provided spending data and return ONLY a raw JSON object — no markdown, no code fences, no explanation. ' +
        'Be specific, honest, and reference exact NZD amounts. ' +
        'Keep notes concise — one to three sentences each. ' +
        'Income framing: when the month is in progress, treat pending expected income as on-track to arrive — do not flag it as a problem. When the month is closed, if expected income met plan and spending stayed within budget, report it as the expected outcome without celebration. If income fell short of plan, or spending exceeded income or budget, be realistic about what went wrong — do not soften the analysis.',
      prompt,
      maxOutputTokens: 1024,
    })

    // Claude sometimes wraps JSON in markdown code fences — strip them before parsing.
    const raw = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()
    summary = parseSummary(raw)
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
