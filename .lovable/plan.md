## What you'll get

1. **Model pill moves off home** → the top bar shows a clean icon-only "Model" chip in Settings only. Home stays quiet like you asked.
2. **Composer quota UI** → inline segmented meter (Text 5 · Image/File 2 · Voice 2) sitting just under the composer, each segment lighting red as it depletes; the affected input (mic / attach / send) shows a lock icon + tooltip when exhausted.
3. **Upgrade flow polish** → single `UpgradeDialog` (benefits, Pro model list, price, "Continue to Cashfree" CTA) opened from: model pill lock, composer lock, quota-exceeded toast, Settings.
4. **Cashfree checkout** → Pro = ₹499/mo one-time top-up (final price your call, easy to change). Server fn creates a Cashfree order, opens hosted checkout, webhook flips the user to Pro.
5. **Secure per-user memory** → Google sign-in via Lovable Cloud. Conversations, usage counters, and `isPro` move from `localStorage` to the database, scoped to `auth.uid()` with RLS. Guests keep the current localStorage flow so the app still works signed-out.

## Answering "why did I put model settings on the home page?"

Old design used the pill for fast switching mid-chat. You've now told me you want it in Settings only — I'll remove it from the top bar and add a proper "Model" section in the Settings sheet (Smart / Eco / Ultra, with Pro-lock on Ultra).

## Technical plan

### Backend (Lovable Cloud — I'll enable it)
Tables (all RLS, `auth.uid()` scoped, `service_role` for webhook):
```text
profiles(user_id pk, is_pro bool, pro_until timestamptz, created_at)
conversations(id, user_id, title, updated_at)
messages(id, conversation_id, user_id, role, content, attachments jsonb, created_at)
usage_daily(user_id, day date, text int, media int, voice int)  -- resets per day
payments(id, user_id, cashfree_order_id, status, amount, raw jsonb, created_at)
```
Trigger: on `auth.users` insert → create `profiles` row. Google OAuth enabled via `configure_social_auth`.

### Server functions (`src/lib/*.functions.ts`)
- `getMe` — profile + today's usage
- `listMessages` / `appendMessage` / `clearConversation`
- `bumpUsage({ kind, n })` — server-authoritative quota (client can't cheat)
- `createCashfreeOrder` — returns `payment_session_id` for hosted checkout
- Public route `src/routes/api/public/cashfree-webhook.ts` — HMAC-verify, mark `payments.status`, flip `profiles.is_pro=true`, log to `webhook_events`

### Frontend
- Remove `ModelPill` from `__root.tsx` top bar; keep the file but only mount inside `SettingsSheet` as a "Model" section.
- New `QuotaMeter` under `Composer`; new `UpgradeDialog`.
- `sendToAI` calls `bumpUsage` server-side before the OpenRouter proxy; server enforces limits (client UI just mirrors state).
- `useConversation` / `useUsage` swap to server fns when signed-in, fall back to localStorage when signed-out.
- Google sign-in button in the header account menu; `/auth` page for the Google broker return.

### Secrets needed from you (one form, after you approve)
- `CASHFREE_APP_ID`
- `CASHFREE_SECRET_KEY`
- `CASHFREE_ENV` (`sandbox` to start, flip to `production` later)

`OPENROUTER_API_KEY` and `LOVABLE_API_KEY` are already set.

### Cashfree webhook + return URLs (I'll wire these; register them in Cashfree dashboard after publish)
- Webhook: `https://<your-project>.lovable.app/api/public/cashfree-webhook`
- Return: `https://<your-project>.lovable.app/upgrade/success?order={order_id}`

## Order of work (single build turn)
1. Enable Cloud, run migration, enable Google.
2. Server fns + webhook + Cashfree client.
3. Move ModelPill into Settings, remove from home.
4. QuotaMeter + UpgradeDialog + composer wiring.
5. Swap conversation/usage/isPro to server-backed when signed-in.
6. Ask for the 3 Cashfree secrets.

Approve and I'll execute end-to-end.