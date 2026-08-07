import { NextResponse } from 'next/server'
import { getAuthUser, isUserAdmin } from '@/lib/adminServer'

// Lightweight check used by the NavBar to decide whether to show the "Admin" tab.
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ isAdmin: false })
  const isAdmin = await isUserAdmin({ id: user.id, email: user.email ?? null })
  return NextResponse.json({ isAdmin })
}
