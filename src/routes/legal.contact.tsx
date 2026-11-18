import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/askeasy/LegalDoc";

const TITLE = "Contact & Support — AskEasy";
const DESC = "Reach AskEasy for product support, feedback, billing questions, privacy requests, or account deletion.";

export const Route = createFileRoute("/legal/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://askeasy.ai/legal/contact" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://askeasy.ai/legal/contact" }],
  }),
  component: Contact,
});

function Contact() {
  return (
    <LegalDoc title="Contact & Support" updated="2026-11-18">
      <p>We read every message. Signed-in customers can also use <strong>Settings → Feedback &amp; support</strong> to save a bug report, feature idea, rating, or support request.</p>
      <h2>Customer support</h2>
      <p><a href="mailto:info@nevika.ai">info@nevika.ai</a> — product help, bugs, subscriptions, payments, and refunds. Include your registered email and payment reference for billing questions. We aim to reply within 3 business days.</p>
      <h2>Privacy and grievances</h2>
      <p><a href="mailto:info@nevika.ai">info@nevika.ai</a> — DPDPA access, correction, erasure, consent withdrawal, nomination, grievance, export, or account-deletion requests. We aim to resolve privacy grievances within 30 days.</p>
      <h2>Service</h2>
      <p>AskEasy · askeasy.ai<br />Nevika Innovations Private Limited, Mumbai, India.</p>
    </LegalDoc>
  );
}
