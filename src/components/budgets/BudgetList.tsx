'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { SetBudgetDialog } from '@/components/budgets/SetBudgetDialog'
import type { BudgetWithActual } from '@/lib/queries/budgets'
import type { BadgeProps } from '@/components/ui/badge'

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatNZD(cents: number): string {
  return nzd.format(cents / 100)
}

interface BudgetListProps {
  items: BudgetWithActual[]
  month: string
}

export function BudgetList({ items, month }: BudgetListProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full table-fixed border-collapse">
          {/* dot / name / bar / amount / badge / link */}
          <colgroup>
            <col className="w-10" />
            <col className="w-52" />
            <col />
            <col className="w-24" />
            <col className="w-20" />
            <col className="w-10" />
          </colgroup>

          {/* Header */}
          <thead>
            <tr className="border-b border-border">
              <th />
              <th className="px-3 py-3 text-left align-middle" colSpan={1}>
                <p className="text-[13px] font-medium text-foreground">All categories</p>
                <p className="text-[11px] text-muted-foreground">Click a budget to edit</p>
              </th>
              <th />
              <th />
              <th />
              <th />
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {items.map(({ category, budget, actual_cents }) => {
              const budgetCents = budget?.amount_cents ?? 0
              const ratio = budgetCents > 0 ? actual_cents / budgetCents : 0
              const pct = Math.min(ratio * 100, 100)
              const isOver = ratio >= 1
              const isApproaching = ratio >= 0.8

              const indicatorClassName = isOver
                ? 'bg-destructive'
                : isApproaching
                  ? 'bg-warning'
                  : 'bg-success'

              const pctBadgeVariant: BadgeProps['variant'] = isOver
                ? 'danger'
                : isApproaching
                  ? 'warn'
                  : 'outline'

              const leftOrOver = budget
                ? isOver
                  ? { amount: formatNZD(actual_cents - budgetCents), label: 'over', over: true }
                  : { amount: formatNZD(budgetCents - actual_cents), label: 'left', over: false }
                : null

              const txHref = `/transactions?cat=${category.id}&month=${month}`

              return (
                <tr
                  key={category.id}
                  onClick={() => setOpenId(category.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpenId(category.id)}
                  tabIndex={0}
                  role="button"
                  className="cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:bg-muted/30"
                >
                  {/* dot */}
                  <td className="pl-4 pr-2 py-3.5 align-middle">
                    <span
                      className="block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: category.color ?? 'hsl(var(--primary))' }}
                    />
                  </td>

                  {/* name + subtitle */}
                  <td className="px-3 py-3.5 align-middle">
                    <p className="truncate text-[13.5px] font-medium">{category.name}</p>
                    <p className="mt-0.5 truncate font-mono text-[11.5px] tabular-nums text-muted-foreground">
                      {formatNZD(actual_cents)} spent
                      {leftOrOver && (
                        <>
                          {' · '}
                          <span className={leftOrOver.over ? 'text-destructive' : ''}>
                            {leftOrOver.amount} {leftOrOver.label}
                          </span>
                        </>
                      )}
                    </p>
                  </td>

                  {/* progress bar / amount / badge — or "No budget set" spanning all three */}
                  {budget ? (
                    <>
                      <td className="px-3 py-3.5 align-middle">
                        <Progress
                          value={pct}
                          className="h-1.5"
                          indicatorClassName={indicatorClassName}
                        />
                      </td>
                      <td className="px-3 py-3.5 align-middle text-right font-mono text-[13px] tabular-nums">
                        {formatNZD(budgetCents)}
                      </td>
                      <td className="pr-2 pl-2 py-3.5 align-middle">
                        <Badge variant={pctBadgeVariant} className="font-mono tabular-nums">
                          {Math.round(ratio * 100)}%
                        </Badge>
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-3.5 align-middle" colSpan={3}>
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                        No budget set
                      </span>
                    </td>
                  )}

                  {/* drill-down link — stop propagation so the row click (edit dialog) doesn't fire */}
                  <td
                    className="pr-3 py-3.5 align-middle"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Link
                      href={txHref}
                      title="View transactions"
                      className="flex items-center justify-center text-muted-foreground/50 transition-colors hover:text-foreground"
                    >
                      <ExternalLink size={13} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Dialogs are portals — safe to render outside the table */}
      {items.map(({ category, budget }) => (
        <SetBudgetDialog
          key={category.id}
          categoryId={category.id}
          categoryName={category.name}
          month={month}
          existing={budget}
          open={openId === category.id}
          onOpenChange={(open) => setOpenId(open ? category.id : null)}
        />
      ))}
    </>
  )
}
