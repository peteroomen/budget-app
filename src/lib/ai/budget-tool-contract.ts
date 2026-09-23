/**
 * The shared shape of the chat's budget-cap write actions.
 *
 * Deliberately dependency-free so client components can import it without pulling the AI
 * SDK or Zod into the browser bundle. The runtime tool definitions live next door in
 * `budget-tools.ts` and are server-only.
 */

export const SET_BUDGET_CAP = 'setBudgetCap'
export const CLEAR_BUDGET_CAP = 'clearBudgetCap'

export interface SetBudgetCapArgs {
  categoryId: string
  amountCents: number
}

export interface ClearBudgetCapArgs {
  categoryId: string
}

/**
 * What the confirmation card reports back to the model once a human has answered it.
 * `applied` is the only value that means a row was written.
 */
export interface BudgetCapToolResult {
  status: 'applied' | 'declined' | 'error'
  message: string
}
