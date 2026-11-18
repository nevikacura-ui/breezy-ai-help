import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/askeasy/LegalDoc";

const TITLE = "AI Usage Policy — AskEasy";
const DESC = "How to use AskEasy's AI safely, including accuracy limits, connected actions, uploads, voice, and prohibited uses.";

export const Route = createFileRoute("/legal/ai-usage")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://askeasy.ai/legal/ai-usage" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://askeasy.ai/legal/ai-usage" }],
  }),
  component: AiUsage,
});

function AiUsage() {
  return (
    <LegalDoc title="AI Usage Policy" updated="2026-11-18">
      <p>This policy explains how AskEasy's AI features work and the care required when using them. It forms part of our Terms of Service.</p>

      <h2>AI-generated answers</h2>
      <p>AskEasy uses third-party language, transcription, and speech models through model-routing providers. Answers are generated probabilistically and may be inaccurate, incomplete, biased, or out of date. Verify important information and use your own judgement.</p>

      <h2>Not professional advice</h2>
      <p>AskEasy does not provide medical, mental-health, legal, financial, tax, or other regulated professional advice. Do not use it for emergencies or decisions that require a qualified professional. Kid-friendly characters do not replace parental supervision.</p>

      <h2>Your prompts and files</h2>
      <ul>
        <li>Only upload content you have the right to use and share.</li>
        <li>Avoid passwords, payment-card details, government identity numbers, private health records, and other unnecessary sensitive information.</li>
        <li>Text, images, documents, or audio needed to answer a request are sent to the relevant AI provider. Account identifiers are not included in the model prompt.</li>
        <li>Private Mode prevents long-term conversation storage in the app, but requests still need to reach the AI provider.</li>
      </ul>

      <h2>Connected actions</h2>
      <p>External actions such as sending email or changing another service require the permissions and approvals shown in the app. Review the recipient, content, and action before approving. You are responsible for actions you approve.</p>

      <h2>Voice and transcription</h2>
      <p>Hold-to-talk audio is processed to produce text. Check the transcript before sending when accuracy matters. Speech output is synthetic and should not be represented as a real person's voice.</p>

      <h2>Prohibited uses</h2>
      <ul>
        <li>No illegal, harmful, exploitative, harassing, hateful, or privacy-invading activity.</li>
        <li>No sexual content involving minors, self-harm facilitation, malware, fraud, or attempts to bypass safety and plan limits.</li>
        <li>No presenting AI output as verified fact or as the work or voice of another person where that would mislead.</li>
      </ul>

      <h2>Memory and control</h2>
      <p>You can clear conversations and remembered preferences, change language and tone, disable connected permissions, or request account deletion. See the Privacy Policy for your DPDPA rights and data choices.</p>

      <h2>Questions or reports</h2>
      <p>Report unsafe output or ask about AI use at <a href="mailto:info@nevika.ai">info@nevika.ai</a>.</p>
    </LegalDoc>
  );
}
