// Central source of truth for plans, pricing packs, and plan/expiry status.
// Shared by the pricing page, checkout session route, Cashfree webhook, dashboard, and upload pages.

export type Tier = 'free' | 'starter' | 'growth' | 'pro' | 'ca_pro' | 'deluxe'

export const FREE_RECON_LIMIT = 2

export interface Pack {
  tier: Tier
  amount: number // INR charged once at checkout
  durationDays: number // length of the paid period
}

export interface TierInfo {
  id: Tier
  name: string
  desc: string
  amount: number // Monthly INR price
  annualAmount?: number
  durationDays: number
  periodLabel: string
  popular?: boolean
  features: string[]
}

export const TIERS: TierInfo[] = [
  {
    id: 'free',
    name: 'Free',
    desc: 'Try GSTMatch free forever',
    amount: 0,
    durationDays: 3650,
    periodLabel: 'forever',
    features: [
      '2 reconciliations / month',
      'Up to 100 invoices / recon',
      'All GST reconciliation types',
      'Sample report download',
      'Excel report download',
      '1 GSTIN profile',
      'Email support',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    desc: 'Perfect for small businesses and individual users',
    amount: 299,
    annualAmount: 2990,
    durationDays: 30,
    periodLabel: 'month',
    features: [
      '10 reconciliations / month',
      'Up to 500 invoices / recon',
      'All GST reconciliation types',
      'Excel & PDF report download',
      '1 GSTIN profile',
      'Basic supplier tracker',
      'ITC at risk summary',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    desc: 'Best for growing businesses and small CA firms',
    amount: 549,
    annualAmount: 4999,
    popular: true,
    durationDays: 30,
    periodLabel: 'month',
    features: [
      '30 reconciliations / month',
      'Up to 2,000 invoices / recon',
      'All GST reconciliation types',
      'ITC at risk dashboard',
      'Supplier tracker with follow-up',
      'Excel & PDF report download',
      '3 GSTIN profiles',
      'Reconciliation history',
      'WhatsApp support',
    ],
  },
  {
    id: 'pro',
    name: 'Professional',
    desc: 'Advanced features for professional users',
    amount: 999,
    annualAmount: 8999,
    durationDays: 30,
    periodLabel: 'month',
    features: [
      '100 reconciliations / month',
      'Up to 10,000 invoices / recon',
      'All GST reconciliation types',
      'Advanced reports & filters',
      'Custom matching rules',
      '10 GSTIN profiles',
      'Supplier follow-up & notes',
      'Compliance score & trend',
      'Priority support',
    ],
  },
  {
    id: 'ca_pro',
    name: 'CA / Business Pro',
    desc: 'For CA firms and businesses with multiple clients',
    amount: 2199,
    annualAmount: 19999,
    durationDays: 30,
    periodLabel: 'month',
    features: [
      'Unlimited reconciliations*',
      'Up to 50,000 invoices / recon',
      'All GST reconciliation types',
      'Multi-client dashboard',
      '25+ GSTIN profiles',
      'Team members & roles',
      'Custom reports',
      'Dedicated account manager',
      'Priority WhatsApp & email support',
    ],
  },
]

export const PRICING_PACKS: Pack[] = [
  { tier: 'starter', amount: 299, durationDays: 30 },
  { tier: 'growth', amount: 549, durationDays: 30 },
  { tier: 'pro', amount: 999, durationDays: 30 },
  { tier: 'ca_pro', amount: 2199, durationDays: 30 },
  { tier: 'deluxe', amount: 4999, durationDays: 365 },
]

export function getPack(tier: Tier | string): Pack | undefined {
  return PRICING_PACKS.find((p) => p.tier === tier)
}

export function getPackByAmount(amount: number): Pack | undefined {
  return PRICING_PACKS.find((p) => p.amount === amount)
}

export interface PlanStatus {
  plan: string
  planExpiresAt: string | null
  active: boolean
  effectivePlan: string
  daysRemaining: number | null
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

export function computePlanStatus(
  plan: string,
  planExpiresAt: string | null
): Omit<PlanStatus, 'plan' | 'planExpiresAt'> {
  const isPaid = ['starter', 'growth', 'pro', 'ca_pro', 'deluxe'].includes(plan)
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

export async function fetchPlanStatus(supabaseClient: any, userId: string): Promise<PlanStatus> {
  let plan = 'free'
  let planExpiresAt: string | null = null

  const { data, error } = await supabaseClient
    .from('users')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .maybeSingle()

  if (error && /plan_expires_at|column|relation/i.test(error.message || '')) {
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
