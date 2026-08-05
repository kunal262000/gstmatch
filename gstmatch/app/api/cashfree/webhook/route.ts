import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createDecipheriv, createHash } from 'crypto'
import { getPack, getPackByAmount, type Tier } from '@/lib/pricing'

const MS_PER_DAY = 1000 * 60 * 60 * 24

// Compute the expiry timestamp for a paid period of `durationDays` from now.
function expiryFromNow(durationDays: number): string {
  return new Date(Date.now() + durationDays * MS_PER_DAY).toISOString()
}

// Resolve which plan + duration was purchased from a Cashfree webhook payload.
// Primary source is the `order_note` we set at session creation ("tier:days");
// falls back to the unique order_amount → pack map, then to legacy price points.
function resolvePurchasedPack(payload: any): { tier: string; durationDays: number } | null {
  const note = payload?.data?.order?.order_note
  if (typeof note === 'string') {
    const [tier, dur] = note.split(':')
    const durationDays = Number(dur)
    if (tier && durationDays > 0) return { tier, durationDays }
  }
  const amt = Number(payload?.data?.order?.order_amount)
  const pack = getPackByAmount(amt)
  if (pack) return { tier: pack.tier, durationDays: pack.durationDays }
  return null
}

// Upsert a user's plan (+ expiry). Resilient to the `plan_expires_at` column
// not existing yet (migration not run): falls back to updating just the plan so
// that a successful payment is never blocked by a missing column.
async function upsertUserPlan(
  admin: any,
  row: { id: string; email: string; plan: string; plan_expires_at?: string }
) {
  let { error } = await admin.from('users').upsert(row)
  if (error && /plan_expires_at|column|relation/i.test(error.message || '')) {
    ; ({ error } = await admin.from('users').upsert({ id: row.id, email: row.email, plan: row.plan }))
  }
  return error
}

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

    // Webhook signature verification. 
    // In production (CASHFREE_VERIFY_WEBHOOK=true), this is REQUIRED.
    // In development, it's optional but recommended.
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
    const shouldVerify = process.env.CASHFREE_VERIFY_WEBHOOK === 'true' || isProduction

    if (shouldVerify && process.env.CASHFREE_WEBHOOK_SECRET) {
      const ts = req.headers.get('x-webhook-timestamp')
      const sig = req.headers.get('x-webhook-signature')
      if (!ts || !sig || !verifyCashfreeWebhook(sig, ts, process.env.CASHFREE_WEBHOOK_SECRET, rawBody)) {
        console.warn('Cashfree webhook signature verification failed.')
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }
      console.log('Cashfree webhook signature verified.')
    } else if (isProduction && !process.env.CASHFREE_WEBHOOK_SECRET) {
      console.error('SECURITY WARNING: CASHFREE_WEBHOOK_SECRET not set in production!')
      return NextResponse.json({ error: 'Webhook verification not configured' }, { status: 500 })
    } else if (shouldVerify && !process.env.CASHFREE_WEBHOOK_SECRET) {
      console.warn('Cashfree webhook verification enabled but CASHFREE_WEBHOOK_SECRET not set.')
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
      const pack = getPack(plan as Tier)
      if (!pack) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }
      const expiresAt = expiryFromNow(pack.durationDays)
      const error = await upsertUserPlan(supabaseAdmin, {
        id: userId,
        email,
        plan: pack.tier,
        plan_expires_at: expiresAt,
      })

      if (error) {
        console.error('Mock database update error:', error)
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      console.log(`[MOCK] User ${userId} plan set to ${pack.tier}, expires ${expiresAt}`)
      return NextResponse.json({ success: true, message: `Mock status updated to ${pack.tier}` })
    }

    // 2. Handle actual Cashfree webhook callbacks
    if (payload.type === 'PAYMENT_SUCCESS_WEBHOOK') {
      const userId = payload.data.customer_details.customer_id
      const userEmail = payload.data.customer_details.customer_email

      const resolved = resolvePurchasedPack(payload)
      if (!resolved) {
        console.warn('Cashfree webhook: could not resolve plan from payload', payload?.data?.order)
        return NextResponse.json({ received: true })
      }

      const expiresAt = expiryFromNow(resolved.durationDays)
      const error = await upsertUserPlan(supabaseAdmin, {
        id: userId,
        email: userEmail,
        plan: resolved.tier,
        plan_expires_at: expiresAt,
      })

      if (error) {
        console.error('Database update error in Cashfree webhook:', error)
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
      }

      console.log(`User ${userId} plan updated to ${resolved.tier} via Cashfree Webhook (expires ${expiresAt})`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
