import { timingSafeEqual } from 'node:crypto'
import { runBankSync } from '@/lib/bank/sync'

export const runtime = 'nodejs'
export const maxDuration = 60
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const received = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret ?? ''}`
  if (
    !secret ||
    Buffer.byteLength(received) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  )
    return Response.json({ error: 'Unauthorised' }, { status: 401 })
  try {
    const result = await runBankSync()
    return Response.json(result, {
      status: result.results.some((r) => r.status === 'error') ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(
      { error: 'Bank sync unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
