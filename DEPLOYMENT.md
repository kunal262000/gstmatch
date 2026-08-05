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
4. Set the webhook URL in Cashfree dashboard to:
   `https://your-app.vercel.app/api/cashfree/webhook`

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
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Railway backend URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_CASHFREE_APP_ID` | Cashfree app ID |
| `CASHFREE_SECRET_KEY` | Cashfree secret key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

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