import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createDecipheriv, createHash } from 'crypto'

// Verify a Cashfree webhook signature (Cashfree webhook v1 / 2024+ format):
//   signature = base64( iv + AES-256-CBC( key = sha256(secret), iv, plaintext ) ),
//   plaintext = `${timestamp}.${rawBody}`
function verifyCashfreeWebhook(signature: string, timestamp: string, secret: string, rawBody: string): boolean {
  try {
    const iv = Buffer.from(signature.slice(0, 24), 'base64') // 16-byte IV (base64 = 24 chars)
    const encrypted = signature.slice(24)
    const key = createHash('sha256').update(secret).digest()
    const decipher = createDecipheriv('aes-256-cbc', key, iv)
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8')
    return decrypted === `${timestamp}.${rawBody}`
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text()
    let payload;
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // Optional webhook signature verification. Enforced ONLY when explicitly enabled
    // (CASHFREE_VERIFY_WEBHOOK=true) so the live flow is never broken by default.
    if (process.env.CASHFREE_VERIFY_WEBHOOK === 'true' && process.env.CASHFREE_WEBHOOK_SECRET) {
      const ts = req.headers.get('x-webhook-timestamp')
      const sig = req.headers.get('x-webhook-signature')
      if (!ts || !sig || !verifyCashfreeWebhook(sig, ts, process.env.CASHFREE_WEBHOOK_SECRET, rawBody)) {
        console.warn('Cashfree webhook signature verification failed.')
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }
      console.log('Cashfree webhook signature verified.')
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
