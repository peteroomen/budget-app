'use client'

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#16a34a', // dark green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#ec4899', // pink
  '#64748b', // slate
  '#6b7280', // gray
  '#78716c', // stone
  '#0f172a', // near-black
]

interface ColorPickerProps {
  name: string
  value: string
  onChange: (color: string) => void
}

export function ColorPicker({ name, value, onChange }: ColorPickerProps) {
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className="h-7 w-7 rounded-full ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{
              backgroundColor: color,
              boxShadow: value === color ? `0 0 0 2px white, 0 0 0 4px ${color}` : undefined,
            }}
            aria-label={color}
            aria-pressed={value === color}
          />
        ))}
      </div>
    </div>
  )
}
