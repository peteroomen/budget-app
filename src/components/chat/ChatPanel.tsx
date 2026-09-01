'use client'

import { useEffect, useState } from 'react'
import { AssistantRuntimeProvider, useAssistantRuntime } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/react-ai-sdk'
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { BudgetCapTarget } from '@/lib/queries/budgets'
import { BudgetCategoriesProvider } from './budget-categories-context'
import { Thread } from './Thread'

interface ChatPanelProps {
  /** Fetched on the server — the confirmation card resolves names against this, not the model. */
  budgetCategories: BudgetCapTarget[]
}

export function ChatPanel({ budgetCategories }: ChatPanelProps) {
  const [sessionKey, setSessionKey] = useState(0)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="font-display text-display-h1 font-medium">Ask Tide</h1>
          <p className="mt-0.5 text-body-sm text-muted-foreground">
            Powered by Tide · session only
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSessionKey((k) => k + 1)}>
          Clear chat
        </Button>
      </div>
      <BudgetCategoriesProvider categories={budgetCategories}>
        <ChatSession key={sessionKey} />
      </BudgetCategoriesProvider>
    </div>
  )
}

function ChatErrorWatcher() {
  const runtime = useAssistantRuntime()

  useEffect(() => {
    return runtime.thread.subscribe(() => {
      const state = runtime.thread.getState()
      const lastMsg = state.messages[state.messages.length - 1]
      if (lastMsg?.role === 'assistant' && lastMsg.status?.type === 'incomplete') {
        const reason = lastMsg.status.reason
        if (reason === 'error') {
          const err = (lastMsg.status as { error?: unknown }).error
          const text =
            err instanceof Error
              ? err.message
              : typeof err === 'string'
                ? err
                : 'The assistant encountered an error. Please try again.'
          toast.error('Chat error', { description: text })
        }
      }
    })
  }, [runtime])

  return null
}

function ChatSession() {
  // Once a confirmation card has been answered (applied, dismissed, or rejected as an
  // unknown category), hand the outcome back to the model so it can respond to what
  // actually happened rather than to what it proposed.
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatErrorWatcher />
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  )
}
