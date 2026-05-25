'use client'

import { useTransition } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setCategoryOverride } from '@/lib/actions/transactions'
import { deleteMerchantMapping } from '@/lib/actions/merchant-map'
import type { Category } from '@/types'

interface Props {
  transactionId: string
  merchantName: string | null
  categoryId: string | null
  categorySource: string | null
  hasMerchantMapping: boolean
  categories: Category[]
}

export function CategoryCell({
  transactionId,
  merchantName,
  categoryId,
  categorySource,
  hasMerchantMapping,
  categories,
}: Props) {
  const [isPending, startTransition] = useTransition()

  function handleCategoryChange(value: string) {
    const newCategoryId = value === 'none' ? null : value
    startTransition(async () => {
      await setCategoryOverride(transactionId, merchantName, newCategoryId)
    })
  }

  function handleForgetMapping() {
    if (!merchantName) return
    startTransition(async () => {
      await deleteMerchantMapping(merchantName)
    })
  }

  const selectedCategory = categories.find((c) => c.id === categoryId)

  return (
    <div className={`flex items-center gap-1 ${isPending ? 'opacity-50' : ''}`}>
      <Select
        value={categoryId ?? 'none'}
        onValueChange={handleCategoryChange}
        disabled={isPending}
      >
        <SelectTrigger className="h-7 text-xs w-40 border-transparent hover:border-input focus:border-input transition-colors">
          <SelectValue>
            {selectedCategory ? (
              <span className="flex items-center gap-1.5">
                {selectedCategory.color && (
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                )}
                {selectedCategory.name}
              </span>
            ) : (
              <span className="text-muted-foreground">Uncategorised</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Uncategorised</span>
          </SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              <span className="flex items-center gap-1.5">
                {cat.color && (
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                )}
                {cat.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {categorySource === 'manual' && (
        <span
          title="Manually overridden"
          className="text-muted-foreground flex-shrink-0"
          aria-label="Manually categorised"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </span>
      )}

      {hasMerchantMapping && merchantName && (
        <button
          type="button"
          onClick={handleForgetMapping}
          disabled={isPending}
          title={`Forget mapping for "${merchantName}"`}
          className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 flex-shrink-0"
          aria-label={`Forget merchant mapping for ${merchantName}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
