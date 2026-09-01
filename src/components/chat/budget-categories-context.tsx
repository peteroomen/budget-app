'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { BudgetCapTarget } from '@/lib/queries/budgets'

/**
 * The category list the budget-cap confirmation card resolves against.
 *
 * This is fetched on the server by the chat page — deliberately not taken from anything
 * the model said. The card shows the name and the current cap from *this* list, and it
 * refuses to offer "Apply" for an id that isn't in it, so a hallucinated or injected id
 * can't be dressed up as a familiar category name in the UI.
 */
const BudgetCategoriesContext = createContext<Map<string, BudgetCapTarget>>(new Map())

export function BudgetCategoriesProvider({
  categories,
  children,
}: {
  categories: BudgetCapTarget[]
  children: ReactNode
}) {
  const map = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  return <BudgetCategoriesContext.Provider value={map}>{children}</BudgetCategoriesContext.Provider>
}

/** Returns the category for an id, or `null` if the model proposed one we don't know. */
export function useBudgetCategory(id: string | undefined): BudgetCapTarget | null {
  const map = useContext(BudgetCategoriesContext)
  if (!id) return null
  return map.get(id) ?? null
}
