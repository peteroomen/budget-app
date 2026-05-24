'use client'

import { useState } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useChatRuntime } from '@assistant-ui/react-ai-sdk'
import { Button } from '@/components/ui/button'
import { Thread } from './Thread'

export function ChatPanel() {
  const [sessionKey, setSessionKey] = useState(0)

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <Button variant="outline" size="sm" onClick={() => setSessionKey((k) => k + 1)}>
          Clear chat
        </Button>
      </div>
      <ChatSession key={sessionKey} />
    </div>
  )
}

function ChatSession() {
  const runtime = useChatRuntime()

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card">
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  )
}
