import { ChatPanel } from '@/components/chat/ChatPanel'
import { getBudgetCapTargets } from '@/lib/queries/budgets'

export default async function ChatPage() {
  // The categories a budget cap can be set on, resolved on the server. The chat's
  // confirmation card uses this to name what it is about to change — a category id the
  // model proposes is only ever matched against this list, never trusted on its own.
  const budgetCategories = await getBudgetCapTargets()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatPanel budgetCategories={budgetCategories} />
    </div>
  )
}
