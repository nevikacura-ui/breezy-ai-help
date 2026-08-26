import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/askeasy/LegalDoc";

const TITLE = "Privacy Policy — AskEasy";
const DESC =
  "How AskEasy collects, uses, stores and protects your data: chats, memory, voice, files, payments and your choices.";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://askeasy.ai/legal/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://askeasy.ai/legal/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalDoc title="Privacy Policy" updated="2026-08-26">
      <p>
        AskEasy ("we", "us") builds a personal AI assistant available at askeasy.ai. This policy explains what we
        collect, why, and the control you have over it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — your sign-in identifier (Puvio account, and phone number if you verify by SMS OTP).</li>
        <li><strong>Conversations</strong> — messages you send, assistant replies, and per-agent memory you allow us to keep.</li>
        <li><strong>Uploads</strong> — images, documents and audio you send, processed to answer your request.</li>
        <li><strong>Preferences</strong> — language, tone, accessibility and mode settings.</li>
        <li><strong>Usage &amp; diagnostics</strong> — anonymous product events (e.g. onboarding completion) and error reports.</li>
        <li><strong>Billing</strong> — subscription status. Card and UPI details are handled by our payment processor; we never see or store them.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To generate answers and complete the tasks you ask for.</li>
        <li>To remember context across a conversation, when memory is enabled.</li>
        <li>To enforce free-tier limits and manage Pro subscriptions.</li>
        <li>To keep the service secure, debug failures, and improve the product.</li>
      </ul>
      <p>We do not sell your data, and we do not use your conversations to train our own models.</p>

      <h2>AI model providers</h2>
      <p>
        To produce replies, the content of your prompt (and any attached text, image or audio) is sent to third-party
        model providers via OpenRouter. They process it to return a response under their own terms and do not receive
        your account identity.
      </p>

      <h2>Processors we rely on</h2>
      <ul>
        <li>Cloud hosting and database (application data, authentication, storage).</li>
        <li>OpenRouter and the underlying model providers (AI responses, transcription, speech).</li>
        <li>Cashfree Payments (subscription checkout, India).</li>
        <li>MSG91 (SMS one-time passcodes, where used).</li>
      </ul>

      <h2>Private Mode</h2>
      <p>
        With Private Mode on, conversations are kept only on your device for the session and are not written to
        long-term memory. Requests still travel to the model provider to be answered.
      </p>

      <h2>Retention</h2>
      <p>
        Chats and memory are kept until you delete them or close your account. Anonymous usage events are retained in
        aggregate. Deleting your account removes your conversations, memory and preferences.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access, correct, export or delete your data, withdraw consent, and clear per-agent memory from
        Settings. Write to <a href="mailto:support@askeasy.ai">support@askeasy.ai</a> and we will respond within 30
        days.
      </p>

      <h2>Children</h2>
      <p>
        Kid-friendly characters are designed for supervised use. AskEasy is not intended for children under 13 to use
        without a parent or guardian's consent and supervision.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, access to stored data is restricted per user by row-level security, and secrets
        are held server-side only.
      </p>

      <h2>Changes</h2>
      <p>We will update this page and revise the date above when this policy changes materially.</p>

      <h2>Contact</h2>
      <p>
        AskEasy · <a href="mailto:support@askeasy.ai">support@askeasy.ai</a>
      </p>
    </LegalDoc>
  );
}
