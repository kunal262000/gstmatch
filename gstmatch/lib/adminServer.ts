import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Note: this module is only imported by API route handlers (server-side),
// so it is safe to use Node/supabase-js service-role clients here.

interface AdminUserRecord {
  is_admin: boolean | null
}

let adminClient: ReturnType<typeof createClient> | null | undefined

// Service-role client (bypasses RLS) used by all admin routes. Returns null when
// Supabase isn't configured (local demo mode).
export function getAdminClient() {
  if (adminClient !== undefined) return adminClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || url.includes('your-project')) {
    adminClient = null
    return adminClient
  }
  adminClient = createClient(url, key, { auth: { persistSession: false } })
  return adminClient
}

// Resolve the currently authenticated user from the browser session cookies.
export async function getAuthUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon || url.includes('your-project')) return null

  const cookieStore = cookies()
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Read-only usage (we never set cookies in the admin API).
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Is this user an admin? Checks (1) the ADMIN_EMAILS env allow-list and
// (2) the users.is_admin flag in the database. Either grants admin access.
export async function isUserAdmin(user: { email: string | null; id: string } | null): Promise<boolean> {
  if (!user?.email) return false

  const emails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (emails.includes(user.email.toLowerCase())) return true

  const admin = getAdminClient()
  if (!admin) return false
  const { data } = await admin
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  return Boolean((data as AdminUserRecord | null)?.is_admin)
}
