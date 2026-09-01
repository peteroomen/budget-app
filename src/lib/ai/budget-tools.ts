import { tool } from 'ai'
import { z } from 'zod'
import {
  SET_BUDGET_CAP,
  CLEAR_BUDGET_CAP,
  type SetBudgetCapArgs,
  type ClearBudgetCapArgs,
  type BudgetCapToolResult,
} from './budget-tool-contract'

/**
 * Chat write actions for budget caps.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * These tools are deliberately declared WITHOUT an `execute` function.
 *
 * That is the safety mechanism, and it is structural rather than prompted. With no
 * `execute`, `streamText` emits the tool call and stops. The call streams to the browser
 * as a tool-call message part, Assistant UI renders a confirmation card, and the actual
 * database write only happens when the user clicks "Apply" — at which point the click
 * handler calls the ordinary `upsertBudget` / `deleteBudget` server actions.
 *
 * Why it has to be this way: the chat context (`src/lib/queries/chat-context.ts`) injects
 * merchant names, transaction descriptions and notes that originate in imported bank
 * statements — text an outside party can influence. Once the model can write, a crafted
 * merchant name becomes a write primitive. A system-prompt rule like "always confirm
 * first" does not contain that, because injected text competes with the system prompt on
 * equal footing. A UI gate does: there is no code path from a model token to a `budgets`
 * row that does not pass through a human click.
 *
 * DO NOT add an `execute` function to these tools, and do not write to the database from
 * this file. If a future tool needs to perform a write without confirmation, that is a
 * separate decision that has to be made explicitly — see `docs/decisions/004-*`.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Note also that `categoryId` is only ever a *proposal*. It is matched against the
 * server-fetched category list before the card offers to apply it, and the server actions
 * re-derive `household_id` from the session. Nothing the model says is trusted as
 * authority over which household or category is written to.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

const categoryId = z
  .string()
  .regex(UUID_RE, 'Must be a category id copied verbatim from the Category IDs list')
  .describe(
    'The id of the category, copied exactly from the "Category IDs" list in the financial ' +
      'data. Never invent an id and never guess one from a category name.'
  )

// $1,000,000 ceiling — a household cap above this is a typo, not an intention.
const MAX_CAP_CENTS = 100_000_000

export const setBudgetCapInput = z.object({
  categoryId,
  amountCents: z
    .number()
    .int()
    .min(0)
    .max(MAX_CAP_CENTS)
    .describe('The proposed cap in whole cents. $250 is 25000.'),
})

export const clearBudgetCapInput = z.object({ categoryId })

/**
 * What the confirmation card hands back once a human has answered it. Declaring it here
 * (rather than an `execute`) is what tells the AI SDK this tool is resolved on the client.
 */
export const budgetCapOutput = z.object({
  status: z.enum(['applied', 'declined', 'error']),
  message: z.string(),
})

export const budgetWriteTools = {
  [SET_BUDGET_CAP]: tool<SetBudgetCapArgs, BudgetCapToolResult>({
    description:
      'Propose a budget cap for a spending category. This does NOT change anything on its ' +
      'own — it shows the user a confirmation card that they must approve. Caps are global: ' +
      'one standing value per category that applies to every month, so there is no month to ' +
      'specify. Call this at most once per reply, and only when the user has asked for a cap ' +
      'to be set or changed.',
    inputSchema: setBudgetCapInput,
    outputSchema: budgetCapOutput,
    // No `execute` — see the file header. This is the confirmation gate.
  }),

  [CLEAR_BUDGET_CAP]: tool<ClearBudgetCapArgs, BudgetCapToolResult>({
    description:
      'Propose removing a category’s budget cap entirely, leaving it uncapped. This does ' +
      'NOT change anything on its own — it shows the user a confirmation card that they must ' +
      'approve. Call this at most once per reply, and only when the user has asked for a cap ' +
      'to be removed.',
    inputSchema: clearBudgetCapInput,
    outputSchema: budgetCapOutput,
    // No `execute` — see the file header. This is the confirmation gate.
  }),
}
