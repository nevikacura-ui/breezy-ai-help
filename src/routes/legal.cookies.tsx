import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/askeasy/LegalDoc";

const TITLE = "Cookie Policy — AskEasy";
const DESC = "The browser storage AskEasy uses for sign-in, preferences, privacy-friendly analytics, and your cookie choices.";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://askeasy.ai/legal/cookies" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://askeasy.ai/legal/cookies" }],
  }),
  component: Cookies,
});

function Cookies() {
  return (
    <LegalDoc title="Cookie Policy" updated="2026-11-18">
      <p>AskEasy uses a small amount of necessary browser storage. Our visit analytics does not use cookies, and we do not run advertising tags.</p>

      <h2>Necessary browser storage</h2>
      <ul>
        <li><strong>Sign-in and security</strong> — session tokens and one-time sign-in state keep your account secure and restore your session.</li>
        <li><strong>Your settings</strong> — theme, language, accessibility, onboarding categories, local conversations, and agent choices make the app work as you configured it.</li>
        <li><strong>Consent choices</strong> — your analytics answer is saved in your browser for up to 12 months. A refusal may be asked again sooner.</li>
        <li><strong>Push notifications</strong> — if you enable them, a browser service worker and device token deliver reminders. You can turn this off in Settings.</li>
      </ul>

      <h2>Analytics without cookies</h2>
      <p>Lovable's analytics uses no cookies, stores nothing on the visitor's device, doesn't keep IP addresses, and doesn't identify visitors. It records pages visited, where visitors came from, their country, browser, operating system and device type, how long they stay, how fast pages load, errors, and clicks on this site. AskEasy's own error reports are covered by error reporting.</p>
      <p>Lovable collects this data for us. <a href="https://lovable.dev/privacy" target="_blank" rel="noreferrer">Lovable's privacy policy</a> explains how it handles it. Detailed data is kept for 90 days and daily summaries for a year.</p>
      <p>Page visits, time on page, page speed, and errors are recorded for every visitor without cookies and without identifying anyone. Clicks and AskEasy's product events wait for analytics permission in consent regions and are never sent for visitors whose browser sends Global Privacy Control. Your consent choice is saved in your browser for up to 12 months.</p>

      <h2>AskEasy product events</h2>
      <p>We separately record limited product events such as onboarding category choices, onboarding completion, legal-link opens, and a random session identifier. These help us measure activation and support flows. They are sent only when analytics permission allows.</p>

      <h2>Your choices</h2>
      <p>Use the <strong>Cookie settings</strong> link in the footer or Settings to accept, reject, or change analytics at any time. Closing the banner grants nothing. Necessary storage remains because sign-in, security, and remembered preferences cannot work without it.</p>

      <h2>Contact</h2>
      <p>Questions about browser storage or privacy: <a href="mailto:info@nevika.ai">info@nevika.ai</a>.</p>
    </LegalDoc>
  );
}
