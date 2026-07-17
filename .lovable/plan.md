# Global AI Assistant — Redesign & De-India

## What ships

1. **Remove India Mode end-to-end**
   - Delete `src/routes/india.tsx`, `tests/e2e/india-mode-*.spec.py`, `src/lib/india-mode-reset.test.ts`, `src/assets/tricolor-ring.png.asset.json`.
   - Strip `indiaMode`, `indiaOnboarded`, `resetIndiaModeArtifacts`, tricolor ring imports from `askeasy.ts`, `Composer.tsx`, `SettingsSheet.tsx`, `index.tsx`.
   - Drop the `askindia` domain redirect. Delete the `.india` theme block in `styles.css`.
   - Replace 24-language dictionary with 10-language reply-mode map (below). Keep the small `useI18n` helper only for UI strings that stay English.

2. **Home = Dribbble Ink & Butter bento (chosen v3 direction)**
   - Cream background surface `#f5f1e8` in light, ink `#0f0f10` in dark; buttery yellow `#ffe066` as primary CTA; lavender `#c9a0dc` secondary accent.
   - Header: brand mark (yellow rounded-square with dot), title "AskEasy", language pill (right), settings icon.
   - Hero copy: "How can I help, {name}?" with a soft subtitle.
   - **Category bento grid** (2-col, one wide + 4 square tiles), each tile pre-fills the composer prompt:
     - Write — story/email/blog
     - Ideas — brainstorm
     - Code — debug/build
     - Learn — explain any concept
     - Plan — trips, days, projects
     - Translate — quick language help
   - Floating pill composer at bottom with yellow send button.
   - Chat view: cream user bubbles on ink surface (dark) / ink bubbles on cream (light); assistant streams plain text.

3. **Language mode (10 languages, trial-gated)**
   - English is the default and always free.
   - Language picker in header + Settings, 10 options: English, Spanish, French, German, Portuguese, Italian, Arabic, Hindi, Chinese (Simplified), Japanese.
   - Selecting a non-English language starts a **3-day free trial** (`trialStartedAt` timestamp saved locally + server profile field if signed in).
   - After trial expires: switching to a non-English language opens the Upgrade dialog; English keeps working free.
   - Pro users bypass the trial gate.

4. **Free English quota**
   - 5 text prompts/day (already in `useUsage`); attachments free tier stays 2 media + 2 voice.
   - Over quota → Upgrade dialog with clear reason.

5. **OpenRouter wiring**
   - Keep `src/routes/api/chat.ts` on OpenRouter (already wired). Rewrite the language-enforcement prompt for the new 10-language map (drop 22-lang Indic block). English default = no language override.

## Technical touchpoints

- `src/lib/askeasy.ts`: bump settings version, remove India fields, add `trialStartedAt: number | null`, add `trialDaysLeft()` helper, replace `LANGUAGES` list, keep `sendToAI` shape.
- `src/lib/i18n.ts`: shrink to the 10-language table (`code`, `label`, `native`, `bcp47`). Remove per-language UI dictionary — UI stays English.
- `src/routes/index.tsx`: full rewrite for the bento home + category tiles that call `setComposerDraft(prompt)`. Composer gains an optional `draft` prop.
- `src/components/askeasy/Composer.tsx`: accept `draft` prop (controlled seed), remove `indiaMode`/tricolor ring branch, keep bubble.
- `src/components/askeasy/SettingsSheet.tsx`: replace India toggle with Language section + trial status; keep model/theme/plan.
- `src/styles.css`: retune tokens for Ink & Butter (light = cream base + ink text; dark = ink base + cream text; `--primary` = butter yellow); remove `.india` block.
- `src/routes/api/chat.ts`: 10-language enforcement block; English = no override.
- Delete: `src/routes/india.tsx`, `tests/e2e/india-mode-*.spec.py`, `src/lib/india-mode-reset.test.ts`, `src/assets/tricolor-ring.png.asset.json`.

## Out of scope this pass
- Server-side trial enforcement on the OpenRouter route (client-gated for now; Pro payment via existing Cashfree flow is unchanged).
- New payment flows; upgrade dialog reused as-is.

Reply **go** and I'll build it.