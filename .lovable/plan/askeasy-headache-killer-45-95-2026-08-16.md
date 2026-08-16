# AskEasy — Headache Killer: 45% → 95%

Three phases. No changes to UI colours, layout, or avatars — new surfaces reuse the existing chat/settings design language.

---

## PHASE 1 — Tool layer + outcome reporting (→ ~70%)

The spec's core gap: AskEasy reasons but cannot *do*. Phase 1 builds the machinery.

1. **Standardised tool interface** (`src/lib/tools/`) — every tool declares name, description, required permission, input schema (Zod), output schema, error shape, audit event. Central registry + executor that writes to the existing `action_audit` table on every call.
2. **Tool-calling loop in `/api/chat`** — pass registered tools to the model, execute approved ones server-side, feed results back, and never let the model claim a result the executor didn't return.
3. **Approval gate** — any tool marked `requiresApproval` returns a proposal instead of executing. Chat renders an approval card: *What I found / What I propose / What I'll do / Approve — Edit — Cancel*. Approving replays the exact tool call.
4. **Outcome report card** — structured assistant output (Outcome → Details → Facts vs Assumptions → Next steps) rendered as a card in the existing bubble styling, with copy/export.
5. **Permissions + audit surface** — `user_integrations` and `tool_permissions` tables (RLS + GRANTs), plus a Settings section listing connections and recent actions.
6. **First tools, no OAuth needed**: web search with citations, document extract/compare, spreadsheet analyse, report/document generate, Cubix handoff (rewired through the tool layer).

**Ship gate:** every tool call visible in the audit log; nothing external happens without an approval tap.

---

## PHASE 2 — Email Headache Killer (→ ~88%)

7. **Google OAuth (Gmail scopes)** — per-user connect flow, encrypted token storage, refresh handling, revoke button. Requires a Google Cloud OAuth client ID/secret.
8. **Microsoft OAuth (Outlook)** — same pattern, behind the same connection UI.
9. **Email tools**: list/search threads, read thread, summarise, classify (needs-reply / lead / FYI / urgent), extract requests + deadlines, fetch and analyse attachments, draft reply, refine draft, send-on-approval only.
10. **Triage view in chat** — "Check my emails and tell me which customers need a reply" returns a ranked list: who, what they want, urgency, suggested reply, next action; each with Draft / Approve & send.
11. **Batch processing** — hand AskEasy N enquiries or documents, get structured classified results as a table with export.
12. **Cubix intent detection upgrade** — recurring email/task phrasing produces a full spec (trigger, conditions, steps, tools, data sources, approvals, schedule) prefilled from the real connected accounts.

**Ship gate:** a live Gmail account can be triaged, a reply drafted and sent only after explicit approval, with an audit row for each step.

---

## PHASE 3 — Reach, calendar/files, and proof of value (→ ~95%)

13. **Calendar + Drive/OneDrive tools** — find slots, create events, read/write files, all approval-gated.
14. **Voice as a real interaction mode** — voice commands routed through the same tool layer (not just transcription), multilingual + Hinglish, spoken outcome summary.
15. **Avatar roles as specialists** — existing avatars gain role prompts and tool scopes (Document Guide, Business Assistant, Finance Explainer, Comms Assistant). Same intelligence, same look.
16. **Personalisation memory** — role, business context, preferred tone/language, approved contacts; user-visible and editable, nothing collected silently.
17. **Safety guardrails** — medical/financial/legal disclaimers, credential redaction, refusal to fabricate action results, hard block on payments.
18. **Metrics** — per-task time saved estimate, steps removed, completion rate, approval rate, Cubix conversion; small internal dashboard.
19. **Eval suite** — fixture-based tests for document understanding, email intent, action extraction, comparison, hallucination detection, automation-intent detection.

**Ship gate:** eval suite green, metrics recording, every integration revocable.

---

## Technical details

- **New tables** (RLS + GRANTs each): `user_integrations` (provider, encrypted tokens, scopes), `tool_permissions`, `tool_runs` (or extend `action_audit`), `user_context` (personalisation), `eval_results`.
- **New server routes**: `src/routes/api/public/oauth-google.ts`, `oauth-microsoft.ts` (callbacks, state-verified), `src/routes/api/tools.ts` (execute/approve).
- **Tool layer**: `src/lib/tools/registry.ts`, `index.ts`, `email.server.ts`, `calendar.server.ts`, `files.server.ts`, `search.server.ts`, `docs.server.ts`. Handlers are server-only; client imports the registry metadata only.
- **Model routing** stays invisible; tool-capable requests pin to a function-calling-capable model.
- **Secrets needed**: `GOOGLE_OAUTH_CLIENT_ID` / `SECRET`, `MICROSOFT_OAUTH_CLIENT_ID` / `SECRET`, token encryption key. `OPENROUTER_API_KEY`, `CUBIX_API_URL`, `CUBIX_API_KEY` already configured.

## Out of scope (keeps the last 5%)

WhatsApp/voice-calling providers, CRM and accounting connectors, enterprise SSO, native mobile app.

---

Reply **go phase 1** to start. Phase 2 needs your Google Cloud OAuth credentials — tell me if you have them, or I'll build phase 2 with the email tools stubbed so they light up the moment you do.
