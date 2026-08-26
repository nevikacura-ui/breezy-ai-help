import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/askeasy/LegalDoc";

const TITLE = "Refund & Cancellation Policy — AskEasy";
const DESC =
  "How to cancel AskEasy Pro, when refunds are issued, and how long refunds take to reach your original payment method.";

export const Route = createFileRoute("/legal/refunds")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://askeasy.ai/legal/refunds" },
    ],
    links: [{ rel: "canonical", href: "https://askeasy.ai/legal/refunds" }],
  }),
  component: Refunds,
});

function Refunds() {
  return (
    <LegalDoc title="Refund & Cancellation Policy" updated="26 August 2026">
      <h2>Subscription</h2>
      <p>
        AskEasy Pro costs ₹499 per month (inclusive of applicable taxes) and renews automatically until you cancel.
        The free tier lets you try AskEasy before paying.
      </p>

      <h2>Cancellation</h2>
      <p>
        Cancel any time from Settings → Subscription, or email us. Cancellation stops the next renewal; Pro features
        stay active until the end of the period you already paid for.
      </p>

      <h2>Refunds</h2>
      <ul>
        <li>Full refund if you request it within 7 days of your first Pro payment and the service didn't work for you.</li>
        <li>Full refund for duplicate or failed-but-charged transactions.</li>
        <li>Pro-rata refunds are not offered for partially used months after the first 7 days.</li>
      </ul>

      <h2>How to request</h2>
      <p>
        Email <a href="mailto:support@askeasy.ai">support@askeasy.ai</a> with the registered account and the payment
        reference. We respond within 3 business days.
      </p>

      <h2>Timeline</h2>
      <p>
        Approved refunds are issued to the original payment method through Cashfree and typically reach you within
        5–10 business days, depending on your bank.
      </p>
    </LegalDoc>
  );
}
