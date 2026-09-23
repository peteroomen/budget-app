/** Reject authority/user-info tricks, protocol-relative URLs and backslash normalization. */
export function localRedirect(next: string | null, origin: string): string {
  if (!next?.startsWith('/') || next.startsWith('//') || next.includes('\\'))
    return `${origin}/dashboard`
  try {
    const target = new URL(next, origin)
    return target.origin === origin ? target.href : `${origin}/dashboard`
  } catch {
    return `${origin}/dashboard`
  }
}
