import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Simple in-memory rate limiter (use Redis in production for multi-instance deployments)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

function getClientIdentifier(request: NextRequest): string {
  // Use IP + User-Agent for basic identification
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  const ua = request.headers.get('user-agent') || 'unknown'
  return `${ip}:${ua.slice(0, 50)}`
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const path = request.nextUrl.pathname

  // ── Bypass middleware for Next.js metadata routes ─────────────────────
  // These MUST NOT be intercepted by middleware — otherwise Supabase SSR
  // attaches Set-Cookie headers to the response and Googlebot / GSC fails
  // to fetch /sitemap.xml and /robots.txt. Matched out by the `matcher`
  // below too, but the early-return here is a defence-in-depth guarantee.
  if (
    path === '/sitemap.xml' ||
    path === '/robots.txt' ||
    path === '/feed.xml' ||
    path.endsWith('/sitemap.xml') ||
    path.endsWith('/robots.txt') ||
    path.endsWith('/feed.xml')
  ) {
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If not configured, bypass middleware so local demo mode works out of the box
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project')) {
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtectedRoute = path.startsWith('/upload') || path.startsWith('/results') || path.startsWith('/dashboard')
  const isDemo = path === '/results/demo'
  const isAuthRoute = path === '/auth'
  const isApiRoute = path.startsWith('/api/')

  // Rate limiting for auth routes (5 requests per minute per IP)
  if (isAuthRoute && request.method === 'POST') {
    const identifier = `auth:${getClientIdentifier(request)}`
    if (!checkRateLimit(identifier, 5, 60_000)) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
      })
    }
  }

  // Rate limiting for API routes (30 requests per minute per IP)
  if (isApiRoute) {
    const identifier = `api:${getClientIdentifier(request)}`
    if (!checkRateLimit(identifier, 30, 60_000)) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
      })
    }
  }

  // Protect /upload, /results (except the demo route) and /dashboard
  if (!user && isProtectedRoute && !isDemo) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  // Logged-in users are bounced off the login page; the "Home" tab (/) stays
  // freely accessible so signed-in users can still view the landing page.
  if (user && path === '/auth') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sitemap.xml / robots.txt / feed.xml — Next.js metadata routes
     *   that must NOT be intercepted by middleware (otherwise Googlebot
     *   gets Supabase Set-Cookie headers attached and GSC fails to
     *   fetch the sitemap).
     * - Images/SVG files in public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|feed\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
