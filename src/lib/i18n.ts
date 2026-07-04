// Lightweight static i18n for India Mode UI strings.
// No API calls — instant switch. AI reply language is handled via a system
// prompt (see /api/chat).

export type LangCode =
  | "en"
  | "hi"
  | "bn"
  | "ta"
  | "te"
  | "mr"
  | "gu"
  | "kn"
  | "ml"
  | "pa"
  | "ur"
  | "or"
  | "as";

export const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: "en", label: "English",   native: "English" },
  { code: "hi", label: "Hindi",     native: "हिन्दी" },
  { code: "bn", label: "Bengali",   native: "বাংলা" },
  { code: "ta", label: "Tamil",     native: "தமிழ்" },
  { code: "te", label: "Telugu",    native: "తెలుగు" },
  { code: "mr", label: "Marathi",   native: "मराठी" },
  { code: "gu", label: "Gujarati",  native: "ગુજરાતી" },
  { code: "kn", label: "Kannada",   native: "ಕನ್ನಡ" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa", label: "Punjabi",   native: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "Urdu",      native: "اردو" },
  { code: "or", label: "Odia",      native: "ଓଡ଼ିଆ" },
  { code: "as", label: "Assamese",  native: "অসমীয়া" },
];

export const LANG_ENGLISH_NAME: Record<LangCode, string> = {
  en: "English", hi: "Hindi", bn: "Bengali", ta: "Tamil", te: "Telugu",
  mr: "Marathi", gu: "Gujarati", kn: "Kannada", ml: "Malayalam",
  pa: "Punjabi", ur: "Urdu", or: "Odia", as: "Assamese",
};

type Dict = Record<string, string>;

const en: Dict = {
  "welcome": "Welcome",
  "welcome.name": "Welcome, {name}",
  "tagline": "I can",
  "onboard.title": "India's own AI",
  "onboard.subtitle": "Ask anything, in your language.",
  "onboard.choose": "Choose your language",
  "onboard.continue": "Continue",
  "onboard.pill": "India's 1st chatbot, built for you",
  "new": "New",
  "settings": "Settings",
  "settings.language": "Language",
  "settings.india": "India Mode",
  "settings.india.hint": "Reply in your language · tricolor UI",
  "footer.disclaimer": "AskEasy can make mistakes. Verify important info.",
  "compose.placeholder": "Ask anything…",
  "typewriter.1": "answer anything, instantly.",
  "typewriter.2": "summarize a long report.",
  "typewriter.3": "draft that email for you.",
  "typewriter.4": "explain it like you're five.",
  "typewriter.5": "plan your next big idea.",
  "typewriter.6": "turn thoughts into words.",
};

const hi: Dict = {
  "welcome": "नमस्ते",
  "welcome.name": "नमस्ते, {name}",
  "tagline": "मैं कर सकता हूँ",
  "onboard.title": "भारत का अपना AI",
  "onboard.subtitle": "अपनी भाषा में कुछ भी पूछें।",
  "onboard.choose": "अपनी भाषा चुनें",
  "onboard.continue": "आगे बढ़ें",
  "onboard.pill": "भारत का पहला चैटबॉट, आपके लिए",
  "new": "नया",
  "settings": "सेटिंग्स",
  "settings.language": "भाषा",
  "settings.india": "इंडिया मोड",
  "settings.india.hint": "आपकी भाषा में जवाब · तिरंगा UI",
  "footer.disclaimer": "AskEasy से गलती हो सकती है। ज़रूरी जानकारी जाँच लें।",
  "compose.placeholder": "कुछ भी पूछें…",
  "typewriter.1": "किसी भी सवाल का तुरंत जवाब दे सकता हूँ।",
  "typewriter.2": "लंबी रिपोर्ट को छोटा कर सकता हूँ।",
  "typewriter.3": "आपके लिए ईमेल लिख सकता हूँ।",
  "typewriter.4": "आसान भाषा में समझा सकता हूँ।",
  "typewriter.5": "अगले बड़े आइडिया की योजना बना सकता हूँ।",
  "typewriter.6": "विचारों को शब्द दे सकता हूँ।",
};

// For other Indic languages we fall back to English until translations are
// added; native names still show in the picker.
const DICTS: Partial<Record<LangCode, Dict>> = { en, hi };

export function t(lang: LangCode, key: string, vars?: Record<string, string>): string {
  const dict = DICTS[lang] ?? en;
  const raw = dict[key] ?? en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
}
