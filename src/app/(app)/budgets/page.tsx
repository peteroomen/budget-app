import { Target, TrendingUp, Wallet, AlertTriangle } from 'lucide-react'
import {
  getBudgetsWithActuals,
  findMostRecentBudgetMonth,
  seedBudgetsFromMonth,
} from '@/lib/queries/budgets'
import { getHouseholdSettings } from '@/lib/queries/household'
import { Card, CardContent } from '@/components/ui/card'
import { BudgetList } from '@/components/budgets/BudgetList'
import { OverBudgetCards } from '@/components/budgets/OverBudgetCards'
import { SeededFromBanner } from '@/components/budgets/SeededFromBanner'
import { AllocationPanel } from '@/components/budgets/AllocationPanel'

const nzd = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatNZD(cents: number) {
  return nzd.format(cents / 100)
}

function currentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function isValidMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}

interface BudgetsPageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = await searchParams
  const month =
    typeof params.month === 'string' && isValidMonth(params.month) ? params.month : currentMonth()

  const [household, initialItems] = await Promise.all([
    getHouseholdSettings(),
    getBudgetsWithActuals(month),
  ])
  let items = initialItems
  let seededFrom: string | null = null

  if (!items.some((item) => item.budget !== null)) {
    const sourceMonth = await findMostRecentBudgetMonth(month)
    if (sourceMonth) {
      await seedBudgetsFromMonth(sourceMonth, month)
      items = await getBudgetsWithActuals(month)
      seededFrom = sourceMonth
    }
  }

  // KPI totals
  const totalBudget = items.reduce((s, i) => s + (i.budget?.amount_cents ?? 0), 0)
  const totalSpent = items.reduce((s, i) => s + i.actual_cents, 0)
  const remaining = Math.max(0, totalBudget - totalSpent)
  const overCount = items.filter((i) => i.budget && i.actual_cents > i.budget.amount_cents).length

  const [yr, mo] = month.split('-').map(Number)
  const monthLabel = new Date(yr!, mo! - 1, 1).toLocaleDateString('en-NZ', {
    month: 'long',
    year: 'numeric',
  })

  const kpis = [
    {
      label: 'Total budget',
      value: totalBudget > 0 ? formatNZD(totalBudget) : '—',
      sub: `${items.filter((i) => i.budget).length} categories`,
      icon: Target,
    },
    {
      label: 'Total spent',
      value: formatNZD(totalSpent),
      sub: totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% of budget` : '',
      icon: TrendingUp,
    },
    {
      label: 'Remaining',
      value: totalBudget > 0 ? formatNZD(remaining) : '—',
      sub: totalBudget > 0 ? `${Math.round((remaining / totalBudget) * 100)}% left` : '',
      icon: Wallet,
    },
    {
      label: 'Over budget',
      value: overCount.toString(),
      sub: overCount > 0 ? 'Needs attention' : 'All on track',
      icon: AlertTriangle,
      highlight: overCount > 0,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-h1 font-medium">Budgets</h1>
        <p className="mt-0.5 text-body-sm text-muted-foreground">
          {items.length} categories · {monthLabel}
        </p>
      </div>

      {seededFrom && <SeededFromBanner sourceMonth={seededFrom} />}

      <AllocationPanel
        expectedIncomeCents={household?.expected_monthly_income_cents ?? null}
        totalBudgetedCents={totalBudget}
      />

      {/* KPI stat row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-label-caps uppercase tracking-[0.05em] font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                  <Icon
                    className={`h-4 w-4 shrink-0 mt-0.5 ${kpi.highlight ? 'text-destructive' : 'text-muted-foreground/50'}`}
                  />
                </div>
                <p
                  className={`mt-1 font-display text-display-metric font-medium tabular-nums leading-none ${
                    kpi.highlight ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {kpi.value}
                </p>
                {kpi.sub && <p className="mt-1 text-label text-muted-foreground">{kpi.sub}</p>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <OverBudgetCards items={items} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No categories found. Add some categories first.
        </p>
      ) : (
        <BudgetList items={items} month={month} />
      )}
    </div>
  )
}
