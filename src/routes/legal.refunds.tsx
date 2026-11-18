import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/askeasy/LegalDoc";

const TITLE = "Refund & Renewal Policy — AskEasy";
const DESC = "How AskEasy Pro's 30-day access works, when refunds are issued, and how long approved refunds take.";

export const Route = createFileRoute("/legal/refunds")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://askeasy.ai/legal/refunds" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://askeasy.ai/legal/refunds" }],
  }),
  component: Refunds,
});

function Refunds() {
  return (
    <LegalDoc title="Refund & Renewal Policy" updated="2026-11-18">
      <h2>Pro access</h2>
      <p>AskEasy Pro costs ₹499 for 30 days (inclusive of applicable taxes). The Free plan lets you try standard features before paying.</p>

      <h2>No automatic renewal</h2>
      <p>Pro does not renew automatically. Each successful payment adds 30 days of access, and your current plan and access end date appear in Settings. You can choose to pay again when you want more Pro time.</p>

      <h2>Refunds</h2>
      <ul>
        <li>Full refund if you request it within 7 days of your first Pro payment and the paid service did not work for you.</li>
        <li>Full refund for duplicate or failed-but-charged transactions.</li>
        <li>Pro-rata refunds are not offered for partially used access after the first 7 days, except where required by law.</li>
      </ul>

      <h2>How to request</h2>
      <p>Email <a href="mailto:info@nevika.ai">info@nevika.ai</a> with the registered account and payment reference. We aim to respond within 3 business days.</p>

      <h2>Timeline</h2>
      <p>Approved refunds are issued to the original payment method through Cashfree and typically reach you within 5–10 business days, depending on your bank.</p>
    </LegalDoc>
  );
}
