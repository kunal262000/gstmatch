import { NextResponse } from 'next/server'
import { getAuthUser, isUserAdmin, getAdminClient } from '@/lib/adminServer'

interface AdminAuthUser {
  id: string
  email: string | null
}

const VALID_PLANS = ['free', 'starter', 'growth', 'deluxe']
const MS_PER_DAY = 1000 * 60 * 60 * 24

// Admin action: set a user's plan (and optional duration for paid plans).
export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!(await isUserAdmin({ id: user.id, email: user.email ?? null }))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, plan, durationDays } = body
  if (!userId || typeof plan !== 'string' || !VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Missing or invalid userId / plan' }, { status: 400 })
  }

  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

  const plan_expires_at =
    plan === 'free'
      ? null
      : new Date(Date.now() + (Number(durationDays) || 30) * MS_PER_DAY).toISOString()

  const { error } = await (admin
    .from('users') as any)
    .update({ plan, plan_expires_at })
    .eq('id', userId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log the admin action.
  await Promise.resolve().then(() =>
    admin.from('user_activity').insert({
      user_id: user.id,
      email: user.email,
      action: 'admin_plan_change',
      detail: { target_user: userId, plan, expires: plan_expires_at },
    } as any)
  )

  return NextResponse.json({ ok: true, plan, plan_expires_at })
}
