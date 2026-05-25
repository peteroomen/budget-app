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

function formatNZD(cents: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function SummaryDisplay({ summary, ctx }: SummaryDisplayProps) {
  return (
    <div className="space-y-6">
      {/* Headline */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-lg font-medium leading-relaxed">{summary.headline}</p>
        </CardContent>
      </Card>

      {/* Spend note + vs last month */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{summary.spendNote}</p>
          </CardContent>
        </Card>

        {summary.vsLastMonthNote && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">vs {ctx.priorMonthLabel ?? 'Last Month'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {summary.vsLastMonthNote}
              </p>
              {ctx.priorMonthSpend !== null && (
                <p className="mt-3 text-xl font-semibold text-red-600">
                  {formatNZD(ctx.priorMonthSpend)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {ctx.priorMonthLabel} spend
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Over-budget + biggest merchant */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {summary.overBudgetCategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-red-600">Over Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {summary.overBudgetCategories.map((item) => (
                  <li key={item.category}>
                    <p className="font-medium">{item.category}</p>
                    <p className="text-sm text-muted-foreground">{item.note}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {summary.biggestMerchantNote && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Biggest Merchant</CardTitle>
            </CardHeader>
            <CardContent>
              {ctx.topMerchants[0] && (
                <p className="mb-2 text-xl font-semibold">
                  {ctx.topMerchants[0].merchant}
                  <span className="ml-2 text-base font-normal text-red-600">
                    {formatNZD(ctx.topMerchants[0].spend_cents)}
                  </span>
                </p>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {summary.biggestMerchantNote}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notable patterns */}
      {summary.notablePatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notable Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.notablePatterns.map((pattern, i) => (
                <li key={i} className="flex gap-2 text-sm text-muted-foreground">
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
