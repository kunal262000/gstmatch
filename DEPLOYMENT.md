# GSTMatch — Deployment Guide

## Architecture

```
Frontend (Next.js) → Vercel
Backend (FastAPI)  → Railway
Database            → Supabase
Payments            → Cashfree
```

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for it to provision (~2 minutes)
3. Go to **Settings → API** and copy:
   - `Project URL` (e.g., `https://abcdefgh.supabase.co`)
   - `anon public` key
   - `service_role` key

4. Go to **SQL Editor** and run:

```sql
-- Reconciliation results table
CREATE TABLE public.reconciliation_results (
    id TEXT PRIMARY KEY,
    user_id UUID,
    period TEXT NOT NULL,
    gstin TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Users table for plan tracking
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    email TEXT,
    plan TEXT DEFAULT 'free',
    plan_expires_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.reconciliation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own results
CREATE POLICY "Users see own results" ON public.reconciliation_results
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: users can insert their own results
CREATE POLICY "Users insert own results" ON public.reconciliation_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: users can read their own plan + expiry (dashboard banner & usage limits)
CREATE POLICY "Users read own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);
```

> **Existing project?** If you created these tables before plan-expiry tracking was added, run the migration in `gstmatch/supabase/migrations/0002_plan_expires_at.sql` to add the `plan_expires_at` column and the read policy.
>
> **Easier option:** run the idempotent migrations in `gstmatch/supabase/migrations/` in filename order instead of the inline SQL above — they create the `reconciliation_results` table (0001), the `users` table + plan-expiry + policies (0002), and the admin activity log (0003). The `reconciliation_results` table **must exist** or results are only kept in memory and a backend restart between save and read produces "Result not found".

5. Go to **Authentication → Settings** and add your Vercel URL to **Redirect URLs**

---

## Step 2: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign up
2. Click **New Project → Deploy from GitHub repo**
3. Select your `gstmatch-api` repository
4. Railway will auto-detect the `Dockerfile` and `railway.toml`
5. Go to **Settings → Environment Variables** and add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ALLOWED_ORIGINS=https://your-app.vercel.app
```

6. Railway will auto-deploy. Wait for the build to finish.
7. Copy your Railway URL (e.g., `https://gstmatch-api-production.up.railway.app`)

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **New Project → Import** your `gstmatch-frontend` repository
3. Set **Root Directory** to `gstmatch` (if your repo has the frontend in a subfolder)
4. Go to **Settings → Environment Variables** and add:

```
NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

5. Click **Deploy**
6. Wait for the build to finish (~2 minutes)
7. Your app is live at `https://your-app.vercel.app`

---

## Step 4: Configure Cashfree (Optional for MVP)

1. Go to [cashfree.com](https://cashfree.com) and create a merchant account
2. Get your **App ID** and **Secret Key** (use TEST keys for testing)
3. Add them to Vercel environment variables (already done in Step 3)
4. **IMPORTANT**: In Cashfree dashboard, go to **Developers → Webhooks → Add Policy** and:
   - Set webhook URL to: `https://your-app.vercel.app/api/cashfree/webhook`
   - Copy the **Webhook Signing Secret** and add it as `CASHFREE_WEBHOOK_SECRET` in Vercel
   - Enable events: `PAYMENT_SUCCESS_WEBHOOK`
5. Set `CASHFREE_VERIFY_WEBHOOK=true` in Vercel environment variables (required for production security)

---

## Step 5: Test Live

1. Visit your Vercel URL
2. Sign up for an account
3. Upload sample files from `sample-data/` folder
4. Run reconciliation
5. Download Excel/PDF reports
6. Check Supabase dashboard to verify data is stored

---

## Environment Variables Summary

### Frontend (Vercel)
| Variable | Value | Required |
|----------|-------|----------|
| `NEXT_PUBLIC_API_URL` | Railway backend URL | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `NEXT_PUBLIC_CASHFREE_APP_ID` | Cashfree app ID | For payments |
| `CASHFREE_SECRET_KEY` | Cashfree secret key | For payments |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes |
| `CASHFREE_WEBHOOK_SECRET` | Cashfree webhook signing secret | **Yes (production)** |
| `CASHFREE_VERIFY_WEBHOOK` | `true` (enables webhook verification) | **Yes (production)** |
| `CASHFREE_ENVIRONMENT` | `PRODUCTION` or `SANDBOX` | For payments |
| `NEXT_PUBLIC_CASHFREE_MODE` | `production` or `sandbox` | For payments |

### Backend (Railway)
| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ALLOWED_ORIGINS` | Vercel frontend URL |

---

## Troubleshooting

### CORS errors
- Ensure `ALLOWED_ORIGINS` in Railway includes your Vercel URL
- Check that `main.py` has the correct CORS configuration

### Auth not working
- Verify Supabase URL and anon key are set in Vercel
- Check Supabase Auth settings for redirect URLs

### File upload fails
- Railway has a 100MB upload limit (sufficient for most files)
- Check that `NEXT_PUBLIC_API_URL` points to the Railway backend

### Payments not working
- Use Cashfree TEST keys first
- Check webhook URL is accessible
- Verify `CASHFREE_SECRET_KEY` is set in Vercel

---

## Sharing one Cashfree account across multiple products

If GSTMatch and another product share the **same Cashfree App ID** (same account), each order
must tell Cashfree **which webhook URL to notify** — otherwise all webhooks go to whichever URL is
set as the app's *default* (one default per app), leaving the other product silently un-upgraded.

### How GSTMatch handles this
`app/api/cashfree/session/route.ts` sets a **per-order** webhook URL in `order_meta.notify_url`:

```js
order_meta: {
  return_url:  `${origin}/payment/result?order_id={order_id}`,
  notify_url:  `${origin}/api/cashfree/webhook`,
}
```

So every GSTMatch order notifies **GSTMatch's** webhook (`/api/cashfree/webhook`) regardless of the
dashboard's default webhook. Your other product will keep working as long as **it** also sends its
own `notify_url` (or is intentionally using the dashboard default).

### Production checklist for this setup
- [ ] `notify_url` in the Create Order body points to GSTMatch's webhook (done in code)
- [ ] `CASHFREE_WEBHOOK_SECRET` is set in Vercel and matches the Cashfree webhook endpoint's signing key
- [ ] `CASHFREE_VERIFY_WEBHOOK=true` (so production plan upgrades are not skipped)
- [ ] `https://gstmatch.cyou/api/cashfree/webhook` is reachable (whitelisted)
- [ ] Your other product sets its **own** `notify_url` (so it doesn't inherit GSTMatch's)

> **Note:** In production, the webhook route is *fail-closed* — if `CASHFREE_WEBHOOK_SECRET` is not
> set (or the HMAC signature doesn't verify), the plan upgrade is **skipped**. Money can still be
> collected, so always keep the secret configured and matching.

---

## Security Features Implemented

### 1. Security Headers (next.config.js)
- **Content-Security-Policy**: Restricts script/style/font sources to trusted domains
- **X-Frame-Options: DENY**: Prevents clickjacking
- **X-Content-Type-Options: nosniff**: Prevents MIME type sniffing
- **X-XSS-Protection**: Legacy XSS protection
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Disables camera/microphone/geolocation

### 2. Rate Limiting (middleware.ts)
- **Auth routes**: 5 requests/minute per IP (prevents brute force)
- **API routes**: 30 requests/minute per IP (prevents abuse)
- In-memory store (use Redis for multi-instance production)

### 3. Webhook Verification (Cashfree)
- **AES-256-CBC + SHA256** signature verification
- **Required in production** (enforced when `CASHFREE_VERIFY_WEBHOOK=true` or `NODE_ENV=production`)
- Fails fast if secret not configured in production

### 4. Row Level Security (Supabase)
- Users can only access their own reconciliation results
- Users can only read their own plan/profile data
- Service role key only used server-side (webhooks)

### 5. Environment Variable Security
- All secrets in `.env` files (gitignored)
- No hardcoded secrets in codebase
- Service role key never exposed to client

### Production Security Checklist
- [ ] Set `CASHFREE_VERIFY_WEBHOOK=true` in Vercel
- [ ] Set `CASHFREE_WEBHOOK_SECRET` from Cashfree dashboard
- [ ] Use strong, unique passwords for all services
- [ ] Enable MFA on Supabase, Vercel, Railway, Cashfree accounts
- [ ] Rotate secrets periodically (every 90 days)
- [ ] Monitor Supabase auth logs for suspicious activity
- [ ] Consider Redis-based rate limiting for multi-instance deployments
