import { SparklesIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SummaryContext } from '@/lib/queries/summary'

import type { MonthlySummaryJSON } from '@/lib/finance/summary-schema'
export type { MonthlySummaryJSON } from '@/lib/finance/summary-schema'

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

function fmt(cents: number) {
  return nzd.format(cents / 100)
}

// ── Sub-components ──────────────────────────────────────────────

function SectionLabel({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <p
      className={`text-display-card-title font-medium uppercase tracking-[0.05em] font-sans ${
        danger ? 'text-destructive' : 'text-muted-foreground'
      }`}
    >
      {children}
    </p>
  )
}

function BigStat({
  label,
  value,
  delta,
  positiveIsGood = true,
}: {
  label: string
  value: string
  delta?: number | null
  positiveIsGood?: boolean
}) {
  const deltaColor =
    delta == null
      ? ''
      : delta > 0
        ? positiveIsGood
          ? 'text-success'
          : 'text-destructive'
        : positiveIsGood
          ? 'text-destructive'
          : 'text-success'

  return (
    <div className="flex-1">
      <p className="text-label text-muted-foreground font-medium">{label}</p>
      <p className="mt-1 font-display text-display-metric font-medium tabular-nums leading-none">
        {value}
      </p>
      {delta != null && (
        <p className={`mt-0.5 font-mono text-label tabular-nums ${deltaColor}`}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta)}%
        </p>
      )}
    </div>
  )
}

function CompareBar({
  label,
  value,
  max,
  primary,
}: {
  label: string
  value: number
  max: number
  primary?: boolean
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="grid grid-cols-[56px_1fr_72px] items-center gap-2.5 text-label">
      <span className="text-muted-foreground truncate">{label}</span>
      <div className="relative h-3 rounded-sm bg-muted">
        <div
          className={`absolute inset-y-0 left-0 rounded-sm transition-all ${primary ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono tabular-nums text-right text-muted-foreground">{fmt(value)}</span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────

export function SummaryDisplay({ summary, ctx }: SummaryDisplayProps) {
  const spendDelta =
    ctx.priorMonthSpend && ctx.priorMonthSpend > 0
      ? Math.round(((ctx.spend_cents - ctx.priorMonthSpend) / ctx.priorMonthSpend) * 100)
      : null

  const maxSpend = Math.max(ctx.spend_cents, ctx.priorMonthSpend ?? 0)

  return (
    <div className="space-y-4">
      {/* Headline — editorial hero */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-6 py-5">
        <div className="mb-3 flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-primary" />
          <span className="text-label-caps uppercase tracking-[0.05em] font-medium text-primary">
            {ctx.monthLabel}
          </span>
        </div>
        <p className="font-display text-display-hero font-medium leading-snug text-foreground">
          {summary.headline}
        </p>
      </div>

      {/* Spend overview + vs last month */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>
              <SectionLabel>Spend overview</SectionLabel>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              {summary.spendNote}
            </p>
            {/* Inline stats */}
            <div className="flex gap-5 border-t border-border pt-4">
              <BigStat
                label="Spend"
                value={fmt(ctx.spend_cents)}
                delta={spendDelta}
                positiveIsGood={false}
              />
              <BigStat label="Income" value={fmt(ctx.income_cents)} />
              <BigStat
                label="Net"
                value={(ctx.net_cents >= 0 ? '+' : '') + fmt(ctx.net_cents)}
                positiveIsGood={true}
              />
            </div>
          </CardContent>
        </Card>

        {summary.vsLastMonthNote && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>
                <SectionLabel>vs {ctx.priorMonthLabel ?? 'Last month'}</SectionLabel>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-body-sm leading-relaxed text-muted-foreground">
                {summary.vsLastMonthNote}
              </p>
              {/* Compare bars */}
              {ctx.priorMonthSpend != null && (
                <div className="space-y-2 border-t border-border pt-4">
                  <CompareBar
                    label={ctx.priorMonthLabel ?? 'Prior'}
                    value={ctx.priorMonthSpend}
                    max={maxSpend}
                  />
                  <CompareBar
                    label={ctx.monthLabel.split(' ')[0] ?? ctx.monthLabel}
                    value={ctx.spend_cents}
                    max={maxSpend}
                    primary
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Over-budget + biggest merchant */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {summary.overBudgetCategories.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>
                <SectionLabel danger>Over budget</SectionLabel>
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
              <CardTitle>
                <SectionLabel>Biggest merchant</SectionLabel>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ctx.topMerchants[0] && (
                <div className="mb-3">
                  <p className="font-display text-display-metric font-medium leading-none">
                    {ctx.topMerchants[0].merchant}
                  </p>
                  <p className="mt-1 font-mono text-label tabular-nums text-muted-foreground">
                    {fmt(ctx.topMerchants[0].spend_cents)}
                  </p>
                </div>
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
            <CardTitle>
              <SectionLabel>Notable patterns</SectionLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.notablePatterns.map((pattern, i) => (
                <li key={i} className="flex gap-2.5 text-body-sm text-muted-foreground">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-primary" />
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
