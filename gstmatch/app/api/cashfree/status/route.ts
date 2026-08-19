import { NextResponse } from 'next/server'
import { getPackByAmount, type Tier } from '@/lib/pricing'

// Resolve the Cashfree environment (sandbox vs production) the same way the
// session route does, so we always query the correct Cashfree API.
function resolveEnvironment(appId: string): { isSandbox: boolean; host: string } {
  const env = (process.env.CASHFREE_ENVIRONMENT || process.env.NEXT_PUBLIC_CASHFREE_MODE || 'production').toLowerCase()
  const isSandbox = env === 'sandbox' || env === 'test' || appId.startsWith('TEST')
  return {
    isSandbox,
    host: isSandbox ? 'https://sandbox.cashfree.com' : 'https://api.cashfree.com',
  }
}

// Normalise Cashfree's order_status into a simple result the UI can render.
// Cashfree statuses: PAID, FAILED, PENDING, CANCELLED, EXPIRED, VOID (etc.)
function normalizeOrderStatus(orderStatus: string | undefined): 'PAID' | 'FAILED' | 'PENDING' | 'UNKNOWN' {
  const s = (orderStatus || '').toUpperCase()
  if (s === 'PAID') return 'PAID'
  if (s === 'FAILED' || s === 'CANCELLED' || s === 'EXPIRED' || s === 'VOID' || s === 'USER_DROPPED') return 'FAILED'
  if (s === 'PENDING' || s === 'PROCESSING') return 'PENDING'
  return 'UNKNOWN'
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('order_id')?.trim()

  if (!orderId) {
    return NextResponse.json({ error: 'Missing order_id parameter' }, { status: 400 })
  }

  const appId = process.env.CASHFREE_APP_ID || process.env.NEXT_PUBLIC_CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY

  // If Cashfree isn't configured (local/mock demo), we can't verify the order
  // server-side. Return `mock: true` so the result page can show a neutral
  // "confirmation underway" state instead of pretending success/failure.
  if (!appId || !secretKey || appId.includes('your_cashfree_app_id') || appId === '') {
    return NextResponse.json({ order_id: orderId, status: 'UNKNOWN', mock: true })
  }

  const { host } = resolveEnvironment(appId)
  const url = `${host}/pg/orders/${encodeURIComponent(orderId)}`

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Cashfree order status lookup failed:', res.status, errText.slice(0, 300))
      return NextResponse.json(
        { error: `Could not verify order: ${errText.slice(0, 300)}` },
        { status: 502 }
      )
    }

    const data = await res.json()

    // Resolve the human-friendly plan name from the unique order amount.
    let planName: string | null = null
    const pack = getPackByAmount(Number(data.order_amount))
    if (pack) {
      const tierName: Record<Tier, string> = {
        free: 'Free',
        starter: 'Starter',
        growth: 'Growth',
        pro: 'Professional',
        ca_pro: 'CA / Business Pro',
        deluxe: 'Deluxe (Annual)',
      }
      planName = tierName[pack.tier] ?? pack.tier
    }

    return NextResponse.json({
      order_id: data.order_id,
      status: normalizeOrderStatus(data.order_status),
      amount: Number(data.order_amount) || null,
      currency: data.order_currency || 'INR',
      plan: planName,
      mock: false,
    })
  } catch (err: any) {
    console.error('Cashfree order status lookup error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
