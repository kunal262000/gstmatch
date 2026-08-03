# Implementation Plan: Priority 1 Features (Supabase Auth, Supabase Storage, Cashfree Payments, Usage Limits & Trial)

This implementation plan details the step-by-step approach to build the first batch of remaining MVP features, focusing on user authentication, result persistence, payment gateway integration, usage limits, and free trial logic.

---

## User Review Required

> [!IMPORTANT]
> **Database Table Creation**: You will need to create the `reconciliation_results` table in your Supabase SQL Editor. The SQL schema is provided below in the **Supabase Storage** section.
>
> **Environment Variables**: Make sure to populate the Supabase and Cashfree environment variables in both `gstmatch-frontend/gstmatch/.env.local` and `gstmatch-api/gstmatch-api/.env` if they are not already set.

---

## Open Questions

> [!NOTE]
> None at the moment. We are proceeding with standard Next.js 14 Cookie-based authentication and Cashfree Checkout SDK integration, keeping a fallback to local/in-memory states if Supabase/Cashfree keys are missing during development.

---

## Proposed Changes

### Component 1: Frontend Authentication (Supabase Auth)

We will introduce client-side and middleware-based authentication using `@supabase/supabase-js`. 

#### [NEW] [supabase.ts](file:///c:/Users/chaitali/OneDrive/Desktop/k/gstmatch-frontend/gstmatch/lib/supabase.ts)
Creates and exports the Supabase client instance.
- Initializes with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Configures token storage and session persistence.

#### [NEW] [page.tsx](file:///c:/Users/chaitali/OneDrive/Desktop/k/gstmatch-frontend/gstmatch/app/auth/page.tsx)
A dedicated, premium Neumorphic Login/Signup page.
- Features standard email/password authentication (sign up and log in tabs).
- Styled using `.neu-raised`, `.neu-inset`, and `.neu-btn-primary`.
- Automatically redirects to `/upload` or the previous page on success.

#### [NEW] [middleware.ts](file:///c:/Users/chaitali/OneDrive/Desktop/k/gstmatch-frontend/gstmatch/middleware.ts)
Next.js Edge middleware to protect application routes.
- Checks if the user is authenticated by inspecting the Supabase cookie session.
- Protects paths: `/upload` and `/results/*`.
- Redirects unauthenticated users to `/auth`.

#### [MODIFY] [NavBar.tsx](file:///c:/Users/chaitali/OneDrive/Desktop/k/gstmatch-frontend/gstmatch/components/NavBar.tsx)
Updates the header navigation:
- Shows the logged-in user's email (shortened/pill styled) and a "Log Out" button.
- Shows "Log In" if the user is guest.
- Hides the "Start free" button or changes it depending on authentication state.

---

### Component 2: Backend Persistence (Supabase Storage)

#### [MODIFY] [job_store.py](file:///c:/Users/chaitali/OneDrive/Desktop/k/gstmatch-api/gstmatch-api/storage/job_store.py)
Replaces the in-memory `_store` dictionary with Supabase REST client requests using `httpx`.
- Fallback: Gracefully falls back to local in-memory dictionaries if Supabase URL or Anon key are not provided in environment variables.
- Uses `jsonb` mapping of `ReconciliationResult`.

#### [MODIFY] [reconcile.py](file:///c:/Users/chaitali/OneDrive/Desktop/k/gstmatch-api/gstmatch-api/api/routes/reconcile.py)
Accepts an optional `user_id` parameter in the reconciliation request and forwards it to the job store.

#### [MODIFY] [api.ts](file:///c:/Users/chaitali/OneDrive/Desktop/k/gstmatch-frontend/gstmatch/lib/api.ts)
Passes the logged-in user's ID as `user_id` in the FormData when initiating reconciliation.

---

### Component 3: Payments & Free Trial (Cashfree + Limits)

#### [NEW] [page.tsx](file:///c:/Users/chaitali/OneDrive/Desktop/k/gstmatch-frontend/gstmatch/app/pricing/page.tsx)
Premium Neumorphic Pricing page showing Starter (₹299/mo) and Growth (₹699/mo) plan cards with "Buy Now" triggers linking to Cashfree.

#### [NEW] [route.ts](file:///c:/Users/chaitali/OneDrive/Desktop/k/gstmatch-frontend/gstmatch/app/api/cashfree/webhook/route.ts)
Backend API Route Handler to verify Cashfree webhooks and update user plan/quota fields in Supabase.

---

## Verification Plan

### Database Setup
Please execute the following SQL in your Supabase SQL editor:
```sql
CREATE TABLE public.reconciliation_results (
    id TEXT PRIMARY KEY,
    user_id UUID,
    period TEXT NOT NULL,
    gstin TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Automated & Manual Tests
1. **Local Install**: Run `npm install @supabase/supabase-js` on the frontend.
2. **Auth Verification**: Visit `/upload` without logging in. Verify redirection to `/auth`. Login/Sign up, verify redirection to `/upload`.
3. **Data Verification**: Run a reconciliation run. Verify that results are stored in the database if Supabase env vars are set.
4. **Offline Fallback**: Run without env variables, verify that reconciliation still works using in-memory store.
