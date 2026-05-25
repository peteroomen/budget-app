'use client'

import { useRef, useState } from 'react'
import { UploadIcon } from 'lucide-react'

interface DropZoneProps {
  onFile: (file: File) => void
  accept?: string
  disabled?: boolean
}

export function DropZone({ onFile, accept = '.csv,.pdf', disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    // Populate the hidden input so the form's FormData includes the file
    if (inputRef.current) {
      const dt = new DataTransfer()
      dt.items.add(file)
      inputRef.current.files = dt.files
    }
    onFile(file)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload statement file"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) handleFile(e.dataTransfer.files[0])
      }}
      className={[
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-12 text-center transition-colors',
        dragging
          ? 'border-primary bg-primary/5'
          : 'border-border bg-muted/40 hover:border-primary/50 hover:bg-muted/60',
        disabled ? 'pointer-events-none opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={disabled}
      />

      {/* Icon circle */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-primary">
        <UploadIcon className="h-5 w-5" />
      </div>

      <p className="font-display text-[16px] font-medium">
        {dragging ? 'Drop to upload' : 'Drag a statement here, or click to choose'}
      </p>
      <p className="mt-1.5 text-body-sm text-muted-foreground">
        CSV or PDF · ANZ, ASB, Westpac, BNZ
      </p>
    </div>
  )
}
