import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/askeasy/LegalDoc";

const TITLE = "Privacy Policy (DPDPA) — AskEasy";
const DESC = "How AskEasy collects, uses, stores and protects account, chat, profile, payment, support, and analytics data under India's DPDPA framework.";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://askeasy.ai/legal/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://askeasy.ai/legal/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalDoc title="Privacy Policy — DPDPA" updated="2026-11-18">
      <p>AskEasy is provided by Nevika Innovations Private Limited, Mumbai, India ("we", "us"). This policy explains the personal data we process, why we process it, and the choices and rights available to you under applicable Indian law, including the Digital Personal Data Protection Act, 2023 (DPDPA).</p>

      <h2>Data we collect</h2>
      <ul>
        <li><strong>Account and profile</strong> — your Puvio account identifier, verified email where available, mobile number when you use SMS OTP or add it for checkout, display name, profile photo, and securely managed account roles.</li>
        <li><strong>Preferences and memory</strong> — language, tone, accessibility settings, onboarding categories, and facts or agent memories you choose to save.</li>
        <li><strong>Conversations and uploads</strong> — messages, assistant replies, images, documents, and audio needed to fulfil your requests.</li>
        <li><strong>Plans and payments</strong> — plan, subscription period, payment status, amount, and transaction references. Puvio and Razorpay process card and UPI credentials; we do not receive or store those credentials.</li>
        <li><strong>Support</strong> — feedback, bug reports, feature requests, optional ratings, and your reply email.</li>
        <li><strong>Notifications</strong> — browser push tokens and reminder delivery status when you enable notifications.</li>
        <li><strong>Product and diagnostic events</strong> — onboarding choices, legal-link opens, errors, and the technical measurements described below.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To authenticate you, restore sessions, and protect your account.</li>
        <li>To generate responses, transcribe speech, provide voice output, and complete requested actions.</li>
        <li>To sync your profile and preferences across devices and remember only what you ask us to remember.</li>
        <li>To enforce plan limits, confirm payments, provide Pro access, and maintain transaction records.</li>
        <li>To answer support requests, deliver reminders, prevent abuse, debug failures, and improve activation and reliability.</li>
      </ul>
      <p>We rely on your requests and consent, the steps needed to provide the service, legitimate uses permitted by law, and legal obligations where applicable. We do not sell personal data and do not use your conversations to train our own models.</p>

      <h2>Service providers and recipients</h2>
      <ul>
        <li>External Supabase infrastructure for authentication, application data, and profile-photo storage.</li>
        <li>Puvio for Puvio ID sign-in and centralized billing; MSG91 for SMS one-time passcodes.</li>
        <li>OpenRouter and its underlying model providers for AI responses, transcription, and speech.</li>
        <li>Razorpay for INR payment processing and transaction confirmation through Puvio.</li>
        <li>Resend for transactional and support email; Firebase Cloud Messaging for browser push notifications.</li>
        <li>Lovable for hosting, error reporting, and the visitor analytics described below.</li>
      </ul>
      <p>Prompts and attachments needed for an AI request are sent to the selected model provider without your account identifier. Providers process data under their own terms. We may also disclose information where required by law or to protect users and the service.</p>

      <h2>Lovable visitor analytics</h2>
      <p>Lovable's analytics uses no cookies, stores nothing on the visitor's device, doesn't keep IP addresses, and doesn't identify visitors. Lovable collects this data for us. <a href="https://lovable.dev/privacy" target="_blank" rel="noreferrer">Lovable's privacy policy</a> explains how it handles it.</p>
      <p>It records pages visited, where visitors came from, their country, browser, operating system and device type, how long they stay, how fast pages load, errors, and clicks on this site. AskEasy's own error reports are covered by error reporting. Detailed data is kept for 90 days and daily summaries for a year.</p>
      <p>Our consent banner passes analytics choices to Google Consent Mode. In the EU/EEA, UK, Switzerland, and all of Canada, clicks and AskEasy's product events are recorded only after analytics acceptance. For everyone else they run unless rejected. They are never sent for visitors whose browser sends Global Privacy Control, even after acceptance. Page visits, time on page, page speed, and errors are recorded for every visitor without cookies and without identifying anyone. The visitor's choice is saved in their browser for up to 12 months.</p>

      <h2>AskEasy product events</h2>
      <p>We separately record limited events such as category selection, onboarding completion, and legal-page link opens with a random session identifier and page path. These events follow your analytics choice. Necessary authentication, security, and preference storage is described in our Cookie Policy.</p>

      <h2>Private Mode and connected actions</h2>
      <p>Private Mode keeps conversations out of long-term app storage, but prompts still travel to the model provider. External actions use the permissions you grant and the approvals shown before an action. Withdrawing a permission does not undo an action already completed.</p>

      <h2>Retention</h2>
      <p>Profiles, preferences, conversations, and memory are kept while your account is active and until you delete them or request account deletion, subject to records we must retain for security, fraud prevention, tax, accounting, or other legal obligations. Support and payment records may be retained for those purposes. Analytics retention is described above.</p>

      <h2>Your DPDPA rights and choices</h2>
      <ul>
        <li>Request access to a summary of your personal data and processing activities.</li>
        <li>Request correction, completion, updating, or erasure, subject to legal retention needs.</li>
        <li>Withdraw consent for future processing; this does not affect processing already lawfully completed.</li>
        <li>Raise a grievance and nominate another person to exercise your rights if you become unable to do so.</li>
        <li>Clear conversations and preferences, change privacy settings, disable push tokens, or use Cookie settings at any time.</li>
      </ul>
      <p>Contact <a href="mailto:info@nevika.ai">info@nevika.ai</a> to exercise a right. We may verify that the request relates to your account. We aim to acknowledge grievances promptly and resolve them within 30 days or the period required by law.</p>

      <h2>Children</h2>
      <p>Kid-friendly characters require parent or guardian consent and supervision for children under 13. A parent or guardian may contact us to review or delete a child's information. Age-appropriate presentation does not make AI output professional or safety advice.</p>

      <h2>Security and international processing</h2>
      <p>We use encrypted transport, per-user row-level access controls, server-held secrets, signed payment webhooks, and role records that customers cannot edit. Providers may process data outside India where permitted by law. No online service can promise absolute security.</p>

      <h2>Changes and contact</h2>
      <p>We will revise this page and its date when the policy changes materially. Privacy requests and grievances: <a href="mailto:info@nevika.ai">info@nevika.ai</a>. Data fiduciary: Nevika Innovations Private Limited, Mumbai, India.</p>
    </LegalDoc>
  );
}
