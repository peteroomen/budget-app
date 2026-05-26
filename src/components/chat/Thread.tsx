'use client'

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  type TextMessagePartProps,
} from '@assistant-ui/react'
import { useAui } from '@assistant-ui/react'
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown'
import { ArrowUpIcon, SparklesIcon } from 'lucide-react'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

const PROMPT_CHIPS = [
  'How much have we spent on groceries this month?',
  'What are our fixed costs?',
  'Where are we over budget?',
  'How does this month compare to last month?',
]

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col overflow-hidden">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
        <ThreadPrimitive.Empty>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
            <p className="font-display text-display-hero-sm font-medium">Ask Tide</p>
            <p className="max-w-xs text-body-sm text-muted-foreground">
              Ask me anything about your finances — spending patterns, budgets, or how this month
              compares to last.
            </p>
            <PromptChips />
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
      </ThreadPrimitive.Viewport>

      <Composer />
    </ThreadPrimitive.Root>
  )
}

function PromptChips() {
  const aui = useAui()

  const send = (text: string) => {
    const isRunning = aui.thread().getState().isRunning
    if (isRunning) return
    aui.thread().append({
      content: [{ type: 'text', text }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      runConfig: (aui.composer().getState() as any).runConfig,
    })
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 max-w-sm">
      {PROMPT_CHIPS.map((chip) => (
        <button
          key={chip}
          onClick={() => send(chip)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-body-xs text-foreground transition-colors hover:bg-muted"
        >
          {chip}
        </button>
      ))}
    </div>
  )
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="my-2 flex justify-end">
      <div className="max-w-[70%] rounded-2xl rounded-tr-sm border border-primary/20 bg-primary/8 px-4 py-2.5 text-foreground">
        <MessagePrimitive.Parts components={{ Text: UserText }} />
      </div>
    </MessagePrimitive.Root>
  )
}

function UserText({ text }: TextMessagePartProps) {
  return <p className="text-body-sm whitespace-pre-wrap">{text}</p>
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="my-3 flex items-start gap-2.5 justify-start">
      {/* Sparkle avatar */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-primary mt-0.5">
        <SparklesIcon className="h-3.5 w-3.5" />
      </div>
      {/* Plain text — no bubble */}
      <div className="min-w-0 flex-1 max-w-[80%]">
        <MessagePrimitive.Parts components={{ Text: AssistantText }} />
      </div>
    </MessagePrimitive.Root>
  )
}

function AssistantText() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm prose-neutral max-w-none dark:prose-invert [&_pre]:overflow-x-auto [&_code]:text-xs"
    />
  )
}

function Composer() {
  return (
    <div className="border-t px-4 pb-4 pt-3">
      <ComposerPrimitive.Root className="flex items-end gap-2 rounded-xl border bg-background px-3 py-2 shadow-sm transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/16">
        <ComposerPrimitive.Input
          autoFocus
          placeholder="Ask about your budget…"
          className="max-h-32 flex-1 resize-none bg-transparent py-1 text-body-sm outline-none placeholder:text-muted-foreground"
          rows={1}
        />
        <ComposerPrimitive.Send
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground',
            'transition-opacity disabled:opacity-30'
          )}
        >
          <ArrowUpIcon className="size-4" />
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
      <p className="mt-1.5 text-center text-[10.5px] text-muted-foreground">
        Financial data only · doesn&apos;t make purchases or transfers
      </p>
    </div>
  )
}
