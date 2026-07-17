// Global AI assistant — 10 top world languages.
// UI stays English; `language` only controls the assistant's reply language.

export type LangCode =
  | "en" | "es" | "fr" | "de" | "pt" | "it" | "ar" | "hi" | "zh" | "ja";

export const LANGUAGES: {
  code: LangCode;
  label: string;
  native: string;
  flag: string;
}[] = [
  { code: "en", label: "English",    native: "English",    flag: "🇬🇧" },
  { code: "es", label: "Spanish",    native: "Español",    flag: "🇪🇸" },
  { code: "fr", label: "French",     native: "Français",   flag: "🇫🇷" },
  { code: "de", label: "German",     native: "Deutsch",    flag: "🇩🇪" },
  { code: "pt", label: "Portuguese", native: "Português",  flag: "🇵🇹" },
  { code: "it", label: "Italian",    native: "Italiano",   flag: "🇮🇹" },
  { code: "ar", label: "Arabic",     native: "العربية",     flag: "🇸🇦" },
  { code: "hi", label: "Hindi",      native: "हिन्दी",       flag: "🇮🇳" },
  { code: "zh", label: "Chinese",    native: "中文",        flag: "🇨🇳" },
  { code: "ja", label: "Japanese",   native: "日本語",      flag: "🇯🇵" },
];

export const LANG_ENGLISH_NAME: Record<LangCode, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
  it: "Italian", ar: "Arabic", hi: "Hindi", zh: "Chinese (Simplified)", ja: "Japanese",
};

export const LANG_SCRIPT: Partial<Record<LangCode, string>> = {
  ar: "Arabic",
  hi: "Devanagari",
  zh: "Simplified Chinese characters",
  ja: "Japanese (Kanji/Kana)",
};

// Minimal English-only UI dictionary kept for compatibility with useI18n callers.
const UI: Record<string, string> = {
  "welcome": "How can I help?",
  "welcome.name": "How can I help, {name}?",
  "tagline": "Ask anything — the easy way.",
  "new": "New",
  "settings": "Settings",
  "footer.disclaimer": "AskEasy can make mistakes. Verify important info.",
  "compose.placeholder": "Ask me anything…",
  "compose.thinking": "Thinking…",
  "upgrade.title": "Upgrade to Pro",
  "upgrade.cta": "Continue to checkout",
  "upgrade.opening": "Opening secure checkout…",
  "auth.signin": "Sign in",
  "typewriter.1": "answer anything, instantly.",
  "typewriter.2": "summarize a long report.",
  "typewriter.3": "draft that email for you.",
  "typewriter.4": "explain it like you're five.",
  "typewriter.5": "plan your next big idea.",
  "typewriter.6": "turn thoughts into words.",
};

export function t(_lang: LangCode, key: string, vars?: Record<string, string>): string {
  let out = UI[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, v);
  return out;
}
