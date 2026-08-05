// Central source of truth for plans, pricing packs, and plan/expiry status.
// Shared by the pricing page, the checkout session route, the Cashfree webhook,
// and the dashboard & upload pages.

export type Tier = 'starter' | 'growth' | 'deluxe'

export interface Pack {
  tier: Tier
  amount: number // INR charged once at checkout
  durationDays: number // length of the paid period
}

// ── Plans (feature copy + price + duration) ────────────────────────────────
export interface TierInfo {
  id: Tier
  name: string
  desc: string
  amount: number // INR charged once at checkout
  durationDays: number // length of the paid period
  periodLabel: string // human-readable duration, e.g. "30 days" / "1 year"
  features: string[]
}

export const TIERS: TierInfo[] = [
  {
    id: 'starter',
    name: 'Starter',
    desc: 'Perfect for small traders and retailers.',
    amount: 399,
    durationDays: 30,
    periodLabel: '30 days',
    features: [
      '1 GSTIN profile',
      'Up to 500 invoices per month',
      'Excel & PDF report download',
      'Fuzzy matching engine (rapidfuzz)',
      'Email compliance support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    desc: 'Best for growing MSMEs and distributors.',
    amount: 699,
    durationDays: 30,
    periodLabel: '30 days',
    features: [
      'Up to 3 GSTIN profiles',
      'Up to 2000 invoices per month',
      'Excel & PDF report download',
      'Fuzzy matching engine (rapidfuzz)',
      'WhatsApp compliance support',
      'Compliance score history trend',
    ],
  },
  {
    id: 'deluxe',
    name: 'Deluxe',
    desc: 'Annual plan for high-volume businesses & CAs.',
    amount: 4999,
    durationDays: 365,
    periodLabel: '1 year',
    features: [
      'Up to 10 GSTIN profiles',
      'Unlimited invoices',
      'Excel & PDF report download',
      'Fuzzy matching engine (rapidfuzz)',
      'Priority WhatsApp + email support',
      'Compliance score history trend',
      'Custom matching rules',
      'Dedicated account manager',
    ],
  },
]

// ── Purchasable packs (one per tier) ───────────────────────────────────────
// Amounts are unique, so the webhook can resolve a paid order back to its pack
// purely from order_amount.
export const PRICING_PACKS: Pack[] = TIERS.map((t) => ({
  tier: t.id,
  amount: t.amount,
  durationDays: t.durationDays,
}))

export function getPack(tier: Tier | string): Pack | undefined {
  return PRICING_PACKS.find((p) => p.tier === tier)
}

export function getPackByAmount(amount: number): Pack | undefined {
  return PRICING_PACKS.find((p) => p.amount === amount)
}

// ── Plan / expiry status (used by dashboard & upload) ───────────────────────
export interface PlanStatus {
  plan: string // stored plan value ('free' | 'starter' | 'growth' | 'deluxe')
  planExpiresAt: string | null
  active: boolean // paid AND not yet expired
  effectivePlan: string // 'free' when inactive/expired, else the plan
  daysRemaining: number | null // whole days until expiry (null if no expiry set)
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function computePlanStatus(
  plan: string,
  planExpiresAt: string | null
): Omit<PlanStatus, 'plan' | 'planExpiresAt'> {
  const isPaid = plan === 'starter' || plan === 'growth' || plan === 'deluxe'
  if (!isPaid || !planExpiresAt) {
    return { active: false, effectivePlan: 'free', daysRemaining: null }
  }
  const expiryMs = new Date(planExpiresAt).getTime()
  const daysRemaining = Math.ceil((expiryMs - Date.now()) / MS_PER_DAY)
  const active = daysRemaining > 0
  return {
    active,
    effectivePlan: active ? plan : 'free',
    daysRemaining,
  }
}

// Read the user's plan (+ expiry) from Supabase. Resilient to the
// `plan_expires_at` column not existing yet (migration not run) and to RLS
// denying the read — both gracefully fall back to treating the user as free.
export async function fetchPlanStatus(supabaseClient: any, userId: string): Promise<PlanStatus> {
  let plan = 'free'
  let planExpiresAt: string | null = null

  const { data, error } = await supabaseClient
    .from('users')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .maybeSingle()

  if (error && /plan_expires_at|column|relation/i.test(error.message || '')) {
    // Column (or table) missing — fall back to reading just the plan.
    const { data: data2 } = await supabaseClient
      .from('users')
      .select('plan')
      .eq('id', userId)
      .maybeSingle()
    if (data2) plan = (data2.plan as string) || 'free'
  } else if (data) {
    plan = (data.plan as string) || 'free'
    planExpiresAt = (data.plan_expires_at as string) ?? null
  }

  const status = computePlanStatus(plan, planExpiresAt)
  return { plan, planExpiresAt, ...status }
}

// Format an ISO timestamp as a readable Indian date (e.g. "12 Sep 2025").
export function formatExpiryDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}
