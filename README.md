# Velvet

Paste a real conversation with a real match, get one good reply suggestion back — in your own voice, yours to edit before sending.

## Stack
- **Next.js 14** (App Router), hosted on Vercel
- **Supabase** — email + password auth, a daily usage counter, and the payments ledger
- **Groq** — free, OpenAI-compatible LLM API for generating the suggestion
- **PayPal** — one-time upgrades (no subscription)

## Plans
| Plan | Price | Replies / day |
| ---- | ----- | ------------- |
| Free | $0 | 20 |
| Basic | $10 | 50 |
| Pro | $25 | 250 |
| Unlimited | $50 | Unlimited |

Plans live in `lib/pricing.ts`. A paid plan is granted once PayPal confirms the payment, and the user's `profiles.plan` is updated server-side.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local`, fill in your Supabase, Groq, and PayPal keys
3. Run `supabase/schema.sql` in your Supabase project's SQL editor
4. `npm run dev` → http://localhost:3000

## PayPal
- Uses the PayPal Orders v2 REST API server-side (`lib/paypal.ts`) plus the PayPal JS SDK buttons on the dashboard.
- `PAYPAL_ENV=sandbox` uses `api-m.sandbox.paypal.com` (test payments), `PAYPAL_ENV=live` uses the production API.
- The client button needs `NEXT_PUBLIC_PAYPAL_CLIENT_ID`; the server routes need `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.
- When a capture succeeds, the code writes a completed row into `payments` and upgrades `profiles.plan` — no webhook needed.

## Deploying
Push to GitHub, import into Vercel, add the same env vars from `.env.example` in Project Settings → Environment Variables, deploy. In Supabase, set your production domain as an allowed redirect URL under Authentication → URL Configuration (needed for the email confirmation link to work after deploy).

## Notes
- Groq's free tier is rate-limited and model availability can change — check console.groq.com for current free models if `GROQ_MODEL` stops working.
- The usage counter uses read-then-write, fine at low traffic. `supabase/schema.sql` includes an atomic `increment_usage()` function — switch `lib/usage.ts` to call it via `supabase.rpc()` if you ever see concurrent-request issues.
- `profiles` rows are created automatically by the `handle_new_user()` trigger in `supabase/schema.sql` when an account is created.
