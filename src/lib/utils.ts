import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Derive up to 2 uppercase initials from a display name or email address.
 * "Peter Oomen" → "PO", "peter@home.nz" → "P"
 */
export function getInitials(displayName: string | null, email: string): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/)
    const first = parts.at(0) ?? ''
    const last = parts.at(-1) ?? ''
    if (parts.length >= 2 && first !== last) {
      return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
    }
    return first.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 1).toUpperCase()
}
