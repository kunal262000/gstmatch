import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    let payload;
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // If Supabase credentials are missing or default, log and return early
    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your-project')) {
      console.warn('Supabase not configured in Cashfree webhook.')
      return NextResponse.json({ message: 'Webhook bypassed: Supabase not configured' })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    // 1. Handle mock subscription upgrades for local testing/review
    if (payload.mock === true) {
      const { userId, email, plan } = payload
      const { error } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          email: email,
          plan: plan,
        })

      if (error) {
        console.error('Mock database update error:', error)
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      console.log(`[MOCK] User ${userId} plan set to ${plan}`)
      return NextResponse.json({ success: true, message: `Mock status updated to ${plan}` })
    }

    // 2. Handle actual Cashfree webhook callbacks
    if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const orderAmount = payload.data.order.order_amount
      const userId = payload.data.customer_details.customer_id
      const userEmail = payload.data.customer_details.customer_email

      let plan = 'free'
      if (orderAmount === 299) plan = 'starter'
      else if (orderAmount === 699) plan = 'growth'
      else if (orderAmount > 299 && orderAmount < 600) plan = 'starter'
      else if (orderAmount >= 600) plan = 'growth'

      const { error } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          email: userEmail,
          plan: plan,
        })

      if (error) {
        console.error('Database update error in Cashfree webhook:', error)
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      console.log(`User ${userId} plan updated to ${plan} via Cashfree Webhook`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
