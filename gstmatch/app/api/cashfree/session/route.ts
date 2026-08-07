import { NextResponse } from 'next/server'
import { getPack, type Tier } from '@/lib/pricing'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, userId, plan, phone } = body

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required customer parameters' }, { status: 400 })
    }

    // Resolve the selected plan to a single trusted amount on the server, so
    // the price can never be tampered with from the client.
    const pack = getPack(plan as Tier)
    if (!pack) {
      return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
    }

    const appId = process.env.CASHFREE_APP_ID || process.env.NEXT_PUBLIC_CASHFREE_APP_ID
    const secretKey = process.env.CASHFREE_SECRET_KEY

    // Fallback to mock session if Cashfree credentials are not set
    if (!appId || !secretKey || appId.includes('your_cashfree_app_id') || appId === '') {
      const mockSessionId = `mock_session_${Math.random().toString(36).substring(2, 11)}`
      return NextResponse.json({
        payment_session_id: mockSessionId,
        order_id: `mock_order_${Date.now()}`,
        mock: true
      })
    }

    // Cashfree's Create Order API requires a real 10-digit customer phone.
    const cleanPhone = (phone || '').replace(/\D/g, '')
    if (!/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'A valid 10-digit mobile number is required for checkout.' }, { status: 400 })
    }

    const orderId = `order_${userId.substring(0, 8)}_${Date.now()}`
    
    // Resolve environment: explicit CASHFREE_ENVIRONMENT (or NEXT_PUBLIC_CASHFREE_MODE)
    // wins; otherwise default to production. TEST-prefixed app IDs still imply sandbox.
    const env = (process.env.CASHFREE_ENVIRONMENT || process.env.NEXT_PUBLIC_CASHFREE_MODE || 'production').toLowerCase()
    const isSandbox = env === 'sandbox' || env === 'test' || appId.startsWith('TEST')
    const url = isSandbox 
      ? 'https://sandbox.cashfree.com/pg/orders'
      : 'https://api.cashfree.com/pg/orders'

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: pack.amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: userId,
          customer_email: email,
          customer_phone: cleanPhone,
        },
        order_note: `${pack.tier}:${pack.durationDays}`,
        order_meta: {
          return_url: `${new URL(req.url).origin}/payment/result?order_id={order_id}`,
          notify_url: `${new URL(req.url).origin}/api/cashfree/webhook`,
        }
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Cashfree Create Order failed:', errText)
      return NextResponse.json(
        { error: `Cashfree order creation failed: ${errText.slice(0, 300)}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    return NextResponse.json({
      payment_session_id: data.payment_session_id,
      order_id: data.order_id,
      mock: false
    })
  } catch (err: any) {
    console.error('Checkout session error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
