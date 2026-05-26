'use client'

import { useEffect, useState } from 'react'
import { AssistantRuntimeProvider, useAssistantRuntime } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/react-ai-sdk'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Thread } from './Thread'

export function ChatPanel() {
  const [sessionKey, setSessionKey] = useState(0)

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="font-display text-display-h1 font-medium">Chat with your finances</h1>
          <p className="mt-0.5 text-body-sm text-muted-foreground">
            Powered by Claude · session only
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSessionKey((k) => k + 1)}>
          Clear chat
        </Button>
      </div>
      <ChatSession key={sessionKey} />
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
  const runtime = useChatRuntime()

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatErrorWatcher />
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  )
}
