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

// Per-language dictionary for the few UI strings that must feel native
// when the user picks a reply language. Rest of UI stays English.
type UIKey =
  | "welcome" | "welcome.name" | "tagline" | "new" | "settings"
  | "footer.disclaimer" | "compose.placeholder" | "compose.thinking"
  | "upgrade.title" | "upgrade.cta" | "upgrade.opening" | "auth.signin";

const EN: Record<UIKey, string> = {
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
};

const DICT: Partial<Record<LangCode, Partial<Record<UIKey, string>>>> = {
  es: { "compose.placeholder": "Pregúntame lo que quieras…", "compose.thinking": "Pensando…", "welcome": "¿En qué puedo ayudarte?", "welcome.name": "¿En qué puedo ayudarte, {name}?", "tagline": "Pregunta lo que sea — de forma fácil.", "new": "Nuevo", "settings": "Ajustes" },
  fr: { "compose.placeholder": "Posez-moi une question…", "compose.thinking": "Réflexion…", "welcome": "Comment puis-je vous aider ?", "welcome.name": "Comment puis-je t'aider, {name} ?", "tagline": "Demandez tout — simplement.", "new": "Nouveau", "settings": "Réglages" },
  de: { "compose.placeholder": "Frag mich alles…", "compose.thinking": "Denke nach…", "welcome": "Wie kann ich helfen?", "welcome.name": "Wie kann ich helfen, {name}?", "tagline": "Frag alles — ganz einfach.", "new": "Neu", "settings": "Einstellungen" },
  pt: { "compose.placeholder": "Pergunte-me qualquer coisa…", "compose.thinking": "A pensar…", "welcome": "Como posso ajudar?", "welcome.name": "Como posso ajudar, {name}?", "tagline": "Pergunte qualquer coisa — de forma simples.", "new": "Novo", "settings": "Definições" },
  it: { "compose.placeholder": "Chiedimi qualsiasi cosa…", "compose.thinking": "Sto pensando…", "welcome": "Come posso aiutarti?", "welcome.name": "Come posso aiutarti, {name}?", "tagline": "Chiedi qualsiasi cosa — in modo semplice.", "new": "Nuovo", "settings": "Impostazioni" },
  ar: { "compose.placeholder": "اسألني أي شيء…", "compose.thinking": "أفكّر…", "welcome": "كيف يمكنني المساعدة؟", "welcome.name": "كيف يمكنني المساعدة يا {name}؟", "tagline": "اسأل أي شيء — بكل بساطة.", "new": "جديد", "settings": "الإعدادات" },
  hi: { "compose.placeholder": "मुझसे कुछ भी पूछें…", "compose.thinking": "सोच रहा हूँ…", "welcome": "मैं कैसे मदद करूँ?", "welcome.name": "{name}, मैं कैसे मदद करूँ?", "tagline": "कुछ भी पूछें — आसान तरीके से।", "new": "नया", "settings": "सेटिंग्स" },
  zh: { "compose.placeholder": "问我任何问题…", "compose.thinking": "思考中…", "welcome": "有什么可以帮你的？", "welcome.name": "{name}，有什么可以帮你的？", "tagline": "任何问题 — 轻松作答。", "new": "新建", "settings": "设置" },
  ja: { "compose.placeholder": "なんでも聞いてください…", "compose.thinking": "考え中…", "welcome": "どうしましたか？", "welcome.name": "{name}さん、どうしましたか?", "tagline": "なんでも聞いて — 簡単に。", "new": "新規", "settings": "設定" },
};

export function isRTL(code: LangCode): boolean {
  return code === "ar";
}

/**
 * Cheap client-side language detection over the 10 supported languages.
 * Returns null if the sample is too short or the guess is low-confidence.
 * Uses Unicode-script signals first, then stopword frequency for Latin scripts.
 */
export function detectLanguage(text: string): LangCode | null {
  const s = (text || "").trim();
  if (s.length < 8) return null;

  // Script-based (unambiguous for our set)
  if (/[\u0600-\u06FF]/.test(s)) return "ar";
  if (/[\u0900-\u097F]/.test(s)) return "hi";
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(s)) return "ja"; // kana => JP
  if (/[\u4E00-\u9FFF]/.test(s)) return "zh"; // Han only (no kana) => ZH

  // Latin-script stopword scoring
  const lower = " " + s.toLowerCase().replace(/[^a-záéíóúüñàâçèêëîïôùûœßäöü'\s]/g, " ") + " ";
  const STOP: Record<Exclude<LangCode, "ar" | "hi" | "zh" | "ja">, string[]> = {
    en: [" the ", " and ", " you ", " is ", " to ", " of ", " for ", " what ", " how ", " it "],
    es: [" que ", " de ", " la ", " el ", " los ", " una ", " por ", " para ", " cómo ", " qué "],
    fr: [" le ", " la ", " les ", " des ", " une ", " est ", " pour ", " avec ", " que ", " qu' "],
    de: [" der ", " die ", " das ", " und ", " ist ", " nicht ", " mit ", " ein ", " ich ", " für "],
    pt: [" que ", " não ", " para ", " uma ", " com ", " está ", " você ", " porque ", " como ", " isso "],
    it: [" che ", " non ", " una ", " sono ", " per ", " con ", " gli ", " questo ", " come ", " molto "],
  };
  let best: LangCode | null = null;
  let bestScore = 0;
  for (const [code, words] of Object.entries(STOP) as [LangCode, string[]][]) {
    let score = 0;
    for (const w of words) if (lower.includes(w)) score++;
    if (score > bestScore) { bestScore = score; best = code; }
  }
  return bestScore >= 2 ? best : null;
}

export function t(lang: LangCode, key: string, vars?: Record<string, string>): string {
  const k = key as UIKey;
  let out = DICT[lang]?.[k] ?? EN[k] ?? key;
  if (vars) for (const [kk, v] of Object.entries(vars)) out = out.replaceAll(`{${kk}}`, v);
  return out;
}
