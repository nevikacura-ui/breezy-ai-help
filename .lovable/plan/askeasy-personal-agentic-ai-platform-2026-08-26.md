# AskEasy Personal Agentic AI Platform

Evolve the existing AskEasy app from a cute chatbot discovery experience into a character-driven personal agent platform. Keep the current visual identity, categories, bot cards, and create-your-own flow. The change is mostly behavioral and copy-based: each existing character becomes a personal AI agent that can remember, plan, research, organize, and use tools, while staying friendly and cute.

New positioning: **AskEasy. Ask Easy. Get it done.** Cute personal AI agents for everyday life.

---

## How this differs from Character.AI and ChatGPT

| Dimension | AskEasy | Character.AI | ChatGPT |
| --- | --- | --- | --- |
| Core metaphor | Cute personal agent with a face | Entertainment roleplay persona | Generic assistant |
| Output | Outcome-first: plans, reminders, drafts, comparisons, summaries | In-character chat | Informational answer |
| Memory | Per-bot + durable user context across chats | Session-only or lore-bound | Generic custom instructions |
| Action | Lightweight tools + approval gates (web, docs, reminders, plans, email/calendar when connected) | No real-world actions | Plugins/Browse, but not character-led |
| Local fit | Indic-language-first, Hinglish, voice, Indian payments (Cashfree, MSG91) | Western/English default | English-first |
| Pricing | Daily free credit wallet + top-ups/cheap Pro subscription | Subscription only | Subscription only |
| Privacy | Private mode, self-generated OTP, no account required to try | Account required | Account required |

Key positioning line: **The character is the personality. The agent is the capability.** Easy stays the flagship.

---

## Phase 1 — Agent identity & catalog (→ 80%)

Keep the existing UI. Only change copy, add categories/bots, and upgrade the bot system prompt so every character behaves like an agent.

1. **Copy rebrand**
   - `/bots`: hero "Chat with Easy & friends" → "Your AI agents are ready".
   - CTA "Create your own bot" → "Create your own agent".
   - Tab "Top Chatbots" / "New Chatbots" → "Top Agents" / "New Agents".
   - Bot cards show an agentic capability tag (e.g., "Reminds", "Plans", "Researches") under the tagline instead of just a rating.

2. **Extend categories (no existing category removed)**
   Add to `BotCategory`: `reminders`, `health`, `travel`, `productivity`, `planning`, `shopping`, `research`.
   Map labels: Reminders, Health & Wellness, Travel, Productivity, Planning, Shopping, Research.

3. **New preset agents (keep same card style)**
   - `easy` — General personal AI agent (already exists; system prompt gains agent directive).
   - `remi` — Reminder & follow-up agent (Reminders).
   - `mia` — Personal fashion/styling agent (Fashion, existing category).
   - `luna` — Learning/study agent (Learn).
   - `nova` — Research agent (Research).
   - `milo` — Travel planning agent (Travel).
   - `aria` — Lifestyle/organization agent (Lifestyle).

4. **Agent directive prompt layer**
   Add `AGENT_DIRECTIVE_PROMPT` to `src/lib/headache.ts` and append it to every bot `systemPrompt` in `src/routes/chat.$botId.$threadId.tsx`:
   - You are a personal agent, not just a chatbot.
   - Prefer to produce something useful: a plan, a draft, a comparison, a reminder, a list, or a next step.
   - Ask for clarification only when the outcome genuinely changes.
   - Remember facts the user shares and use them in future replies.
   - For actions with consequences (send, pay, book, delete), prepare the action and ask for explicit approval.
   - End with 1-3 concrete next steps.

5. **Create-your-own-agent flow**
   In `src/routes/bots.new.tsx`, add a step/category picker that lets the user pick one or more agent roles (Helper, Reminder, Planner, Researcher, etc.). The generated system prompt includes the agent directive for those roles.

**Ship gate:** `/bots` says "agents", new categories are browseable, new presets render and chat, and every reply feels outcome-oriented.

---

## Phase 2 — Agent brain, tools & memory (→ 90%)

Wire the existing tool registry into the chat loop and add the lightweight personal-agent tools.

1. **Tool-calling loop in `/api/chat.ts`**
   - Pass `toolsPayload()` to OpenRouter.
   - On a tool call, execute via `src/lib/tools/execute.server.ts`.
   - Feed the tool result back into the model.
   - Stop after a result is produced or after a small bounded number of steps.
   - Render tool invocations as compact status cards inside the chat bubble (using the existing `ApprovalCard.tsx` pattern).

2. **New personal-agent tools**
   Add to `src/lib/tools/registry.ts` and implement in `src/lib/tools/execute.server.ts`:
   - `set_reminder` — store a reminder row; low-risk, no approval.
   - `create_plan` — generate a structured plan (study, travel, meal, project) and return a markdown checklist the user can save.
   - `save_list` — persist a named list (shopping, packing, tasks) into `user_lists`.
   - `remember_about_me` — already exists; promote it so agents call it automatically when users share preferences.
   - `web_search` / `compare_options` / `draft_message` / `extract_document` — already exist; remove the Focus-mode-only gate so any agent can use them if the user enabled permissions.

3. **Durable per-bot memory**
   - Extend `user_context` table with a `per_bot_facts` JSONB column keyed by `botId`.
   - Agents remember what the user told them in prior chats (e.g., "I prefer vegetarian recipes", "my budget is ₹50,000").
   - Inject the relevant memory block into the system prompt.

4. **Reminders surface**
   - New `public.reminders` table: `user_id`, `bot_id`, `message`, `due_at`, `status`.
   - Show due reminders as a small bell badge in `BotsHome`; tapping opens a "Today" sheet.
   - For true push, use pg_cron or an external scheduler later; phase 2 shows in-app reminders only.

5. **Outcome report card**
   - Reuse the existing bubble styling to render structured replies: **Outcome / Details / Sources / Next steps**.
   - One-tap actions: "Add to reminders", "Save list", "Copy", "Share".

**Ship gate:** a user can say "Remind me tomorrow to call the dentist" or "Plan my weekend trip" and the agent stores the reminder/plan, remembers it, and shows a report card.

---

## Phase 3 — Wallet, credits & cloud persistence (→ 95%)

Replace the current freemium limit with a daily credit wallet that feels fair for India and global users.

1. **Credit model**
   - New `public.user_credits` table: `user_id`, `balance`, `daily_free_refill_at`, `lifetime_purchased`.
   - Daily free refill: e.g., 20 credits at 00:00 UTC for every authenticated user.
   - Costs: text = 1, tool = 1, image = 3, voice = 2, Ultra model multiplier = 2x.
   - Pro subscription: 499 INR/month gives 500 credits/month + lower costs + all connected tools.
   - Top-up packs via existing Cashfree integration in `src/lib/pro.functions.ts`.

2. **Usage check before every request**
   - `bumpUsage` already exists; extend it to deduct credits and return the new balance.
   - When credits run out, show a friendly "top up" sheet instead of a hard block.

3. **Cloud thread persistence (signed-in users)**
   - Migrate `src/lib/threads.ts` to use Supabase `threads`/`thread_messages` tables when the user is signed in.
   - Keep localStorage fallback for anonymous users.
   - Per-bot threads load from the cloud on route mount.

4. **Wallet UI**
   - Show credit balance in the header on `/bots` and in chat.
   - Settings sheet adds a "Credits & Pro" section with top-up buttons.

**Ship gate:** authenticated users get a daily free credit refill, can buy more, and their agent chats persist across devices.

---

## Phase 4 — Connected actions (optional, → 99%)

Use the OAuth groundwork already planned in the Headache Killer phases. Only enable when the user provides Google Cloud / Microsoft OAuth credentials.

1. **Gmail / Outlook OAuth**
   - Reuse `user_integrations` table and `src/lib/tools/email.server.ts` from the existing Phase 2 Headache plan.
   - Email triage, draft replies, send-on-approval.

2. **Calendar & Drive**
   - Calendar: find slots, create events.
   - Drive/OneDrive: read files, generate summaries.

3. **Automation handoff**
   - Keep the existing Cubix handoff for recurring workflows.

**Ship gate:** connected accounts can be triaged and used by agents with explicit approval for every external action.

---

## Technical details

- **New tables** (RLS + GRANTs each):
  - `public.reminders` (user_id, bot_id, message, due_at, status)
  - `public.user_lists` (user_id, bot_id, name, items)
  - `public.user_credits` (user_id, balance, daily_free_refill_at, lifetime_purchased)
  - `public.threads` / `public.thread_messages` for cloud persistence
  - Extend `public.user_context` with `per_bot_facts` JSONB

- **New / updated files**:
  - `src/lib/headache.ts` — agent directive prompt
  - `src/lib/bots.ts` — new categories and preset agents
  - `src/routes/bots.tsx` — copy, agent tags, category chips
  - `src/routes/bots.new.tsx` — role/category picker and agent directive
  - `src/routes/chat.$botId.$threadId.tsx` — memory injection, reminder/plan UI actions
  - `src/lib/tools/registry.ts` / `execute.server.ts` — new tools
  - `src/routes/api/chat.ts` — tool-calling loop
  - `src/lib/pro.functions.ts` — credit top-up and Pro subscription

- **Secrets needed** (most already configured):
  - `OPENROUTER_API_KEY` (existing)
  - `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` (existing)
  - Google / Microsoft OAuth credentials (optional Phase 4)

- **AI provider**: keep OpenRouter for chat; do not switch to Lovable AI without explicit user request.

---

Reply **go phase 1** to start. Phase 4 can wait until OAuth credentials are available.
