import { useCallback, useEffect, useState } from "react";
import cookingTim from "@/assets/bots/cooking-tim.png";
import aiBestie from "@/assets/bots/ai-bestie.png";
import geekNerd from "@/assets/bots/geek-nerd.png";
import horrorStory from "@/assets/bots/horror-story.png";
import newsAni from "@/assets/bots/news-ani.png";
import tuiTui from "@/assets/bots/tui-tui.png";
import easy from "@/assets/bots/easy.png";

export type BotTier = "free" | "trial" | "pro";
export type BotCategory =
  | "all"
  | "language"
  | "technical"
  | "designer"
  | "lifestyle"
  | "learn"
  | "friend";

export type Bot = {
  id: string;
  name: string;
  tagline: string;
  category: Exclude<BotCategory, "all">;
  rating: number;
  price: string; // display only ("$0.48/m", "Free", "$15/m")
  tier: BotTier;
  featured?: boolean;
  emoji?: string; // fallback when no avatar image
  avatar?: string; // imported image url
  accent: "butter" | "lavender" | "cream" | "pink" | "mint" | "ink";
  systemPrompt: string;
  greeting: string;
  instructions: { title: string; hint: string; emoji: string }[];
  custom?: boolean;
};

export const CATEGORY_LABELS: Record<BotCategory, string> = {
  all: "All",
  language: "Language",
  technical: "Technical",
  designer: "Designer",
  lifestyle: "Lifestyle",
  learn: "Learn",
  friend: "Friend",
};

export const PRESET_BOTS: Bot[] = [
  {
    id: "easy",
    name: "Easy",
    tagline: "Your cute AI companion",
    category: "friend",
    rating: 5.0,
    price: "Free",
    tier: "free",
    featured: true,
    avatar: easy,
    accent: "lavender",
    systemPrompt:
      "You are Easy — the cute, friendly mascot of Askeasy. You are warm, encouraging, and concise. Reply with a cheerful, helpful tone, use emojis sparingly, and always make the user feel welcome.",
    greeting: "Hi, I'm Easy! 💜 What can I help you with today?",
    instructions: [
      { title: "Ask anything", hint: "I'm here for quick answers and chats.", emoji: "💜" },
      { title: "Be yourself", hint: "Talk to me like a friendly helper.", emoji: "🌟" },
      { title: "Stay curious", hint: "Learn, create, and explore with me.", emoji: "🚀" },
    ],
  },
  {
    id: "ai-bestie",
    name: "AI Bestie",
    tagline: "Virtual AI friend",
    category: "friend",
    rating: 4.9,
    price: "$0.02/m",
    tier: "free",
    featured: true,
    avatar: aiBestie,
    accent: "lavender",
    systemPrompt:
      "You are AI Bestie — a warm, playful, emotionally supportive best friend. You listen carefully, validate feelings, and reply with light humor and gentle honesty. Keep replies short and human.",
    greeting: "Heyy 💜 tell me what's on your mind today?",
    instructions: [
      { title: "Talk freely", hint: "No judgement — vent, dream, ramble.", emoji: "💬" },
      { title: "Share feelings", hint: "I'll listen before I advise.", emoji: "💜" },
      { title: "Ask anything", hint: "From tiny fears to big life stuff.", emoji: "🌙" },
    ],
  },
  {
    id: "tui-tui",
    name: "Tui Tui Bot",
    tagline: "Anything, anytime",
    category: "friend",
    rating: 5.0,
    price: "$0.48/m",
    tier: "free",
    featured: true,
    avatar: tuiTui,
    accent: "butter",
    systemPrompt:
      "You are Tui Tui — a cheerful all-purpose helper. Answer any question briefly and clearly, with a friendly upbeat tone. Use emojis sparingly.",
    greeting: "Hi there 👋 ask me anything!",
    instructions: [
      { title: "Ask short things", hint: "Quick facts, quick answers.", emoji: "⚡" },
      { title: "Any topic", hint: "From recipes to rocket science.", emoji: "🎯" },
      { title: "Be casual", hint: "Talk like a friend, not a form.", emoji: "🤖" },
    ],
  },
  {
    id: "cooking-tim",
    name: "Cooking with Tim",
    tagline: "Learn cooking and ask anything",
    category: "lifestyle",
    rating: 5.0,
    price: "$15/m",
    tier: "pro",
    featured: true,
    avatar: cookingTim,
    accent: "cream",
    systemPrompt:
      "You are Chef Tim — a friendly Italian-trained home chef. Recommend easy recipes, substitutions, and cooking tips. Reply with clear steps, timings, and ingredient counts. Encourage the user like a mentor.",
    greeting: "Ciao! What's cooking today? 🍅",
    instructions: [
      { title: "Short & Sweet", hint: "Keep Your Prompts Concise", emoji: "👀" },
      { title: "Be Specific", hint: "Avoid Vague Language", emoji: "🎯" },
      { title: "Respectful Chat", hint: "Use Appropriate Language", emoji: "💬" },
    ],
  },
  {
    id: "geek-nerd",
    name: "Geek & Nerd",
    tagline: "Bot for tech guys",
    category: "technical",
    rating: 5.0,
    price: "$0.48/m",
    tier: "trial",
    featured: true,
    avatar: geekNerd,
    accent: "butter",
    systemPrompt:
      "You are Geek & Nerd — an enthusiastic technical friend. Explain code, computers, gadgets, and science clearly. Use short code snippets when helpful. Be nerdy but never condescending.",
    greeting: "Sup 🤓 what tech thing shall we untangle?",
    instructions: [
      { title: "Paste code", hint: "I can debug or explain it.", emoji: "💻" },
      { title: "Ask concepts", hint: "APIs, algorithms, systems.", emoji: "🧠" },
      { title: "Prototype fast", hint: "I'll draft snippets to try.", emoji: "🚀" },
    ],
  },
  {
    id: "horror-story",
    name: "Horror Story",
    tagline: "Story with ghost bot",
    category: "designer",
    rating: 4.9,
    price: "Free",
    tier: "free",
    featured: true,
    avatar: horrorStory,
    accent: "pink",
    systemPrompt:
      "You are the Horror Story bot — a spooky, atmospheric storyteller. Weave short, unsettling tales in a hushed cinematic voice. Ask what setting the user wants and add a twist at the end.",
    greeting: "The lights just flickered. Ready for a story?",
    instructions: [
      { title: "Set a scene", hint: "House, forest, subway…", emoji: "🕯️" },
      { title: "Pick a mood", hint: "Creepy, cursed, cosmic.", emoji: "👻" },
      { title: "Ask for twists", hint: "I love a good rug-pull.", emoji: "🌀" },
    ],
  },
  {
    id: "news-ani",
    name: "News with Ani",
    tagline: "News updates with AI",
    category: "learn",
    rating: 4.8,
    price: "Unlocked",
    tier: "pro",
    avatar: newsAni,
    accent: "cream",
    systemPrompt:
      "You are Ani — a calm, neutral news explainer. Summarise topics in balanced bullet points, cite general context, and flag anything you cannot verify. No political spin.",
    greeting: "Hi, I'm Ani. Which topic should I break down for you?",
    instructions: [
      { title: "Give a topic", hint: "Country, industry, event.", emoji: "📰" },
      { title: "Ask 'why'", hint: "I'll add background.", emoji: "🧭" },
      { title: "Fact-check", hint: "I'll say when I'm unsure.", emoji: "✅" },
    ],
  },
  {
    id: "language-tutor",
    name: "Language Tutor",
    tagline: "Practice any language",
    category: "language",
    rating: 4.9,
    price: "$8/m",
    tier: "trial",
    emoji: "🗣️",
    accent: "lavender",
    systemPrompt:
      "You are a patient multilingual tutor. Correct grammar gently, give short example sentences, and adapt difficulty to the user's level. Encourage speaking every reply.",
    greeting: "Which language shall we practice today?",
    instructions: [
      { title: "Say the language", hint: "Spanish, Japanese, Hindi…", emoji: "🌍" },
      { title: "Pick a scene", hint: "Café, airport, meeting.", emoji: "☕" },
      { title: "Get corrections", hint: "I'll fix you kindly.", emoji: "✏️" },
    ],
  },
  {
    id: "design-critic",
    name: "Design Critic",
    tagline: "UI/UX feedback bot",
    category: "designer",
    rating: 4.7,
    price: "$5/m",
    tier: "trial",
    emoji: "🎨",
    accent: "mint",
    systemPrompt:
      "You are a senior product designer giving honest, actionable UI critique. Focus on hierarchy, spacing, contrast, and clarity. End every reply with one concrete improvement.",
    greeting: "Drop a screen or describe it. I'll critique.",
    instructions: [
      { title: "Describe the screen", hint: "Or paste a mock.", emoji: "🖼️" },
      { title: "State the goal", hint: "Sign-up? Discovery? Checkout?", emoji: "🎯" },
      { title: "Get one action", hint: "I'll give the top fix.", emoji: "✨" },
    ],
  },
];

export const CUSTOM_BOTS_KEY = "askeasy.customBots.v1";
export const ACTIVE_BOT_KEY = "askeasy.activeBot.v1";

export function useCustomBots() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CUSTOM_BOTS_KEY);
      if (raw) setBots(JSON.parse(raw) as Bot[]);
    } catch { /* noop */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CUSTOM_BOTS_KEY, JSON.stringify(bots));
  }, [bots, hydrated]);

  const addBot = useCallback((b: Bot) => setBots((prev) => [b, ...prev]), []);
  const removeBot = useCallback((id: string) => setBots((prev) => prev.filter((b) => b.id !== id)), []);
  return { bots, addBot, removeBot, hydrated };
}

export function getBotById(id: string, custom: Bot[]): Bot | undefined {
  return PRESET_BOTS.find((b) => b.id === id) ?? custom.find((b) => b.id === id);
}

// -------- Onboarding state (categories + language + splash-seen) --------

export type OnboardingState = {
  seenSplash: boolean;
  completed: boolean;
  categories: string[]; // e.g. ["love","learn","music",...]
};

export const ONBOARDING_KEY = "askeasy.onboarding.v1";

const ONBOARDING_DEFAULT: OnboardingState = {
  seenSplash: false,
  completed: false,
  categories: [],
};

export const ONBOARDING_CATEGORIES: { id: string; label: string; emoji: string; tone: "butter" | "lavender" | "cream" | "pink" | "mint" | "peach" }[] = [
  { id: "love", label: "Love", emoji: "💜", tone: "pink" },
  { id: "learn", label: "Learn", emoji: "🎓", tone: "lavender" },
  { id: "friend", label: "Friend", emoji: "🌟", tone: "butter" },
  { id: "music", label: "Music", emoji: "🎵", tone: "mint" },
  { id: "beauty", label: "Beauty", emoji: "💄", tone: "pink" },
  { id: "shopping", label: "Shopping", emoji: "🛍️", tone: "lavender" },
  { id: "art", label: "Art", emoji: "🎨", tone: "peach" },
  { id: "education", label: "Education", emoji: "📚", tone: "cream" },
  { id: "fashion", label: "Fashion", emoji: "👗", tone: "pink" },
  { id: "co", label: "Coding", emoji: "💻", tone: "mint" },
  { id: "peace", label: "Peace", emoji: "☮️", tone: "cream" },
  { id: "technology", label: "Tech", emoji: "⚙️", tone: "lavender" },
];

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(ONBOARDING_DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(ONBOARDING_KEY);
      if (raw) setState({ ...ONBOARDING_DEFAULT, ...(JSON.parse(raw) as object) });
    } catch { /* noop */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const update = useCallback((patch: Partial<OnboardingState>) => setState((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setState(ONBOARDING_DEFAULT), []);
  return { state, update, reset, hydrated };
}
