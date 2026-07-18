# AskEasy → Launch-Ready 99%

Three phases. Each phase is a shippable checkpoint. Reply **go phase 1** (or `go all`) and I execute.

---

## PHASE 1 — Blockers (must-fix before any paid launch)

**Goal:** app is secure, legally launch-able, and can't be gamed.

1. **Server-side quota enforcement** — move 5-text / 2-media / 2-voice limits into `/api/chat`, `/api/tts`, `/api/transcribe`. Use existing `usage_daily` table + `bump_usage` RPC. Reject with 429 when over. Client `useUsage` becomes a mirror, not the source of truth.
2. **Server-side language-trial gate** — persist `trial_started_at` on `profiles`; `/api/chat` refuses non-English for free users past 3 days.
3. **Cashfree webhook hardening** — HMAC signature verify + idempotency dedupe on `webhook_events.id` before flipping `is_pro`.
4. **Anon-call lockdown on `/api/chat`** — require auth; add per-IP rate-limit (10 req/min) via in-memory ring for signed-in floor.
5. **RLS audit + linter pass** — run `supabase--linter`, fix every warning. Verify RLS+GRANT on `messages`, `payments`, `profiles`, `usage_daily`, `webhook_events`.
6. **Error + notFound boundaries** on every route with a loader; `defaultErrorComponent` on router.
7. **Legal pages** — `/terms`, `/privacy`, `/refund`, `/contact`. Placeholder copy generated from persona (you replace before launch).
8. **SEO metadata per route** — unique `head()` title/desc on `/`, `/auth`, `/bots`, `/chat/$botId`, `/upgrade/success`; og:image = the askeasy banner asset.

**Ship gate:** run security scan → 0 critical. All routes pass typecheck + smoke test.

---

## PHASE 2 — Premium Polish (perceived-quality wins)

**Goal:** feels like ChatGPT, not a hobby project.

9. **Streaming responses (SSE)** — biggest UX win. Rewrite `/api/chat` to stream OpenRouter tokens; render progressively in `Bubble`.
10. **Stop / regenerate buttons** on assistant messages.
11. **Copy / share / export chat** (Markdown + PDF via existing `src/lib/pdf.ts`).
12. **Chat history sidebar** — multiple threads per bot with rename + delete. New `conversations` table.
13. **Loading skeletons** for `/bots`, chat empty states, avatar upload.
14. **Mood chip emoji fix** — replace broken glyphs with lucide `Smile/Meh/Frown/Sparkles`.
15. **Onboarding skip** for returning users.
16. **Toasts for network/offline errors** + retry.
17. **Keyboard shortcuts** — ⌘K bot switcher, ⌘/ focus composer, Esc stop.

**Ship gate:** full click-through in both themes, all 10 languages, mobile viewport.

---

## PHASE 3 — Premium Features (Pro upsell fuel)

**Goal:** clear reason to pay ₹299/mo, not just "unlimited".

18. **Cross-bot memory graph** — one shared `about_me` table read by all bots. Free = 3 facts, Pro = unlimited.
19. **Voice-to-voice mode** — full duplex like ChatGPT Advanced Voice. Reuses existing Web Speech + `/api/tts`. Pro-only.
20. **Image generation** via OpenRouter (Gemini image / Flux). Pro-only. 20/mo cap.
21. **URL + YouTube ingestion** — paste any link, Easy fetches + summarizes with citations. Extends existing PDF path.
22. **Scheduled prompts** — "every Monday 8am summarize my week." pg_cron → `/api/public/scheduled-run`. Pro-only.
23. **Referral rewards** — invite 3 → 1 month Pro free. `referrals` table + share-link generator.

**Ship gate:** each premium feature has a paywall, a free preview, and analytics event.

---

## Technical details

- **New tables:** `conversations`, `about_me`, `referrals`, `scheduled_prompts` — each with RLS + GRANTs per canonical pattern.
- **`profiles` additions:** `trial_started_at timestamptz`, `referral_code text unique`, `referred_by uuid`.
- **New server fns (`.functions.ts`):** `startLanguageTrial`, `getUsageStatus`, `listConversations`, `createConversation`, `deleteConversation`, `generateImage`, `redeemReferral`.
- **New routes:** `/terms`, `/privacy`, `/refund`, `/contact`, `/chat/$botId/$threadId`, `/settings/memory`, `/settings/referrals`, `/api/public/cron-scheduled`.
- **Streaming:** switch `/api/chat` to `ReadableStream` + `text/event-stream`; client consumes with `fetch` + `getReader()`, updates message in-place.
- **Webhook hardening:** `crypto.timingSafeEqual` on Cashfree x-webhook-signature; `webhook_events` unique constraint on `(source, event_id)` for idempotency.

## Explicitly out of scope

- Native mobile app (PWA install prompt only).
- Server-side i18n for UI strings (stays English, per your earlier call).
- Custom bot marketplace (post-launch).
- Family plan / team seats (post-launch).

---

**Estimated size:** Phase 1 ~6 focused edit batches, Phase 2 ~8, Phase 3 ~10. About 25 files touched total, ~4 new migrations.

Reply **`go phase 1`**, **`go phase 1+2`**, or **`go all`**.
