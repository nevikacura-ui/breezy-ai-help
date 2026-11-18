# External database connection

- [x] Inspect the existing external database read-only and inventory exposed tables.
- [x] Force browser and server runtime configuration to the external project.
- [x] Connect privileged server operations through the securely stored external secret key.
- [x] Adapt profile, payment, and webhook access to the existing shared table structures.
- [x] Reuse the secure Supabase migration connection and apply only the nine missing tables plus required functions, grants, and RLS.
- [x] Verify REST connectivity, external admin authentication, public learning access, child-session privacy, and preservation of existing data.
- [x] Remove the protected temporary inspection endpoint and report the active project ref, found/created tables, data preservation, and connection evidence.

# Step 3 — Puvio ecosystem integration

- [x] Finish Puvio ID OAuth/OIDC PKCE with the production callback and profile mapping.
- [x] Add the signed Protocol 1.1 receiver, persistent replay/idempotency protection, real capabilities, and discovery reporting.
- [x] Use Puvio centralized INR-only checkout and verify paid billing returns before activating Pro.
- [x] Add Puvio Box and Truverify AI trust badges.
- [x] Test signature failures, replay-window rules, paid-return activation and retry safety, routes, types, and preview build.
- [x] International Stripe pricing is deferred by the user; build INR checkout only.
- [ ] Live signed probe, discovery submission, and real INR checkout remain unverified until Puvio supplies PUVIO_EXEC_SIGNING_KEY and PUVIO_SUBMISSION_TOKEN; no interactive secret request was opened.

# Step 2 — Core customer infrastructure

- [x] Reuse phone OTP login and add persistent profiles for display name, avatar, preferences, and secure read-only roles.
- [x] Add Free/Pro plan details with live account reflection after checkout and account changes; defer Puvio checkout to Step 3.
- [x] Add a customer feedback/support modal backed by durable requests and email notification.
- [x] Complete Terms, DPDPA Privacy, AI Usage, Refund, Cookie, and Contact pages with a consent banner and permanent cookie settings.
- [x] Apply the required Consumer AI Studio (Almost Company) footer, info@nevika.ai support email, trademark notice, and contact-privacy checks.
- [x] Test OTP/profile/plan/support/consent flows, verify the production build, and commit the completed Step 2 work.
