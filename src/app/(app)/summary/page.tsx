import { Suspense } from 'react'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase/server'
import { currentMonth } from '@/lib/utils/month'
import { getSummaryContext, buildSummaryPrompt } from '@/lib/queries/summary'
import { SummaryMonthSelector } from '@/components/summary/SummaryMonthSelector'
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
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentMonth()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAdmin = user?.app_metadata?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-display-summary-h1 font-medium">Monthly recap</h1>
          <p className="mt-0.5 font-display italic text-body-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-NZ', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}{' '}
            · powered by Claude
          </p>
        </div>
        <SummaryMonthSelector month={month} allowFuture={isAdmin} />
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
