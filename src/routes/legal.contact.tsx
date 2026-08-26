import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/askeasy/LegalDoc";

const TITLE = "Contact & Support — AskEasy";
const DESC = "Reach the AskEasy team for support, billing questions, privacy requests or account deletion.";

export const Route = createFileRoute("/legal/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://askeasy.ai/legal/contact" },
    ],
    links: [{ rel: "canonical", href: "https://askeasy.ai/legal/contact" }],
  }),
  component: Contact,
});

function Contact() {
  return (
    <LegalDoc title="Contact & Support" updated="26 August 2026">
      <p>We're a small team and read every message.</p>
      <h2>Support</h2>
      <p>
        <a href="mailto:support@askeasy.ai">support@askeasy.ai</a> — product help, bugs, billing, refunds. We reply
        within 3 business days.
      </p>
      <h2>Privacy requests</h2>
      <p>
        <a href="mailto:support@askeasy.ai">support@askeasy.ai</a> — data access, export or account deletion. Handled
        within 30 days.
      </p>
      <h2>Service</h2>
      <p>AskEasy · askeasy.ai · India</p>
    </LegalDoc>
  );
}
