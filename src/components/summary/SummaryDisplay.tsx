import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SummaryContext } from '@/lib/queries/summary'

export interface MonthlySummaryJSON {
  headline: string
  spendNote: string
  overBudgetCategories: Array<{ category: string; note: string }>
  biggestMerchantNote: string | null
  vsLastMonthNote: string | null
  notablePatterns: string[]
}

interface SummaryDisplayProps {
  summary: MonthlySummaryJSON
  ctx: SummaryContext
}

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatNZD(cents: number): string {
  return nzd.format(cents / 100)
}

export function SummaryDisplay({ summary, ctx }: SummaryDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Headline — editorial hero */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-6 py-5">
        <p className="font-display text-display-hero font-medium leading-snug text-foreground">
          {summary.headline}
        </p>
      </div>

      {/* Spend note + vs last month */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-display-card-title font-medium uppercase tracking-[0.05em] text-muted-foreground">
              Spend Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              {summary.spendNote}
            </p>
          </CardContent>
        </Card>

        {summary.vsLastMonthNote && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-sans text-display-card-title font-medium uppercase tracking-[0.05em] text-muted-foreground">
                vs {ctx.priorMonthLabel ?? 'Last Month'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ctx.priorMonthSpend !== null && (
                <p className="font-display text-display-metric font-medium tabular-nums leading-none mb-2">
                  {formatNZD(ctx.priorMonthSpend)}
                  <span className="ml-2 font-sans text-body-sm font-normal text-muted-foreground">
                    {ctx.priorMonthLabel}
                  </span>
                </p>
              )}
              <p className="text-body-sm leading-relaxed text-muted-foreground">
                {summary.vsLastMonthNote}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Over-budget + biggest merchant */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {summary.overBudgetCategories.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-sans text-display-card-title font-medium uppercase tracking-[0.05em] text-destructive">
                Over Budget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {summary.overBudgetCategories.map((item) => (
                  <li key={item.category}>
                    <p className="text-display-card-title font-medium">{item.category}</p>
                    <p className="text-body-sm text-muted-foreground">{item.note}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {summary.biggestMerchantNote && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-sans text-display-card-title font-medium uppercase tracking-[0.05em] text-muted-foreground">
                Biggest Merchant
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ctx.topMerchants[0] && (
                <p className="font-display text-display-metric font-medium tabular-nums leading-none mb-2">
                  {ctx.topMerchants[0].merchant}
                  <span className="ml-2 font-mono font-sans text-body-sm font-normal text-muted-foreground tabular-nums">
                    {formatNZD(ctx.topMerchants[0].spend_cents)}
                  </span>
                </p>
              )}
              <p className="text-body-sm leading-relaxed text-muted-foreground">
                {summary.biggestMerchantNote}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notable patterns */}
      {summary.notablePatterns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-display-card-title font-medium uppercase tracking-[0.05em] text-muted-foreground">
              Notable Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.notablePatterns.map((pattern, i) => (
                <li key={i} className="flex gap-2 text-body-sm text-muted-foreground">
                  <span className="mt-0.5 shrink-0 text-primary">•</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
