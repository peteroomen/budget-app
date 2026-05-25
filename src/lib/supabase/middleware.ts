import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { GoTrueClient } from '@supabase/supabase-js'

const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/confirm']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            if (options) {
              supabaseResponse.cookies.set(name, value, options)
            } else {
              supabaseResponse.cookies.set(name, value)
            }
          })
        },
      },
    }
  )

  // Cast through GoTrueClient to work around SupabaseAuthClient type-resolution
  // differences in certain build environments (Vercel). At runtime, supabase.auth
  // IS a GoTrueClient subclass and getUser() exists.
  const {
    data: { user },
  } = await (supabase.auth as unknown as GoTrueClient).getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  const isRoot = pathname === '/'

  if (!user && !isPublic && !isRoot) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
