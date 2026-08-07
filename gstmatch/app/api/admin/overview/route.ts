import { NextResponse } from 'next/server'
import { getAuthUser, isUserAdmin, getAdminClient } from '@/lib/adminServer'

interface AdminUser {
  id: string
  email: string | null
  plan: string
  is_admin: boolean | null
  usage_count: number | null
  plan_expires_at: string | null
  created_at: string
}

interface ActivityRow {
  id: number
  user_id: string | null
  email: string | null
  action: string
  detail: Record<string, any> | null
  created_at: string
}

const PAID_PLANS = ['starter', 'growth', 'deluxe']

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  if (!(await isUserAdmin({ id: user.id, email: user.email ?? null }))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = getAdminClient()
  if (!admin) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const [usersRes, activityRes, reconRes] = await Promise.all([
    admin
      .from('users')
      .select('id, email, plan, is_admin, usage_count, plan_expires_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    admin
      .from('user_activity')
      .select('id, user_id, email, action, detail, created_at')
      .order('created_at', { ascending: false })
      .limit(300),
    admin.from('reconciliation_results').select('id', { count: 'exact', head: true }),
  ])

  const users: AdminUser[] = usersRes.data || []
  const now = Date.now()
  const paidUsers = users.filter(
    (u) =>
      PAID_PLANS.includes(u.plan) &&
      (!u.plan_expires_at || new Date(u.plan_expires_at).getTime() > now)
  )
  const activity: ActivityRow[] = activityRes.data || []

  return NextResponse.json({
    stats: {
      totalUsers: users.length,
      paidUsers: paidUsers.length,
      totalReconciliations: reconRes.count ?? 0,
      activityCount: activity.length,
    },
    users,
    activity,
  })
}
