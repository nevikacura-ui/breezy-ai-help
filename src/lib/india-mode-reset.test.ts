import { describe, it, expect, beforeEach } from "vitest";
import {
  resetIndiaModeArtifacts,
  SETTINGS_KEY,
  MESSAGES_KEY,
  USAGE_KEY,
} from "@/lib/askeasy";

describe("resetIndiaModeArtifacts (India Mode off integration)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("removes cached messages, india-scoped keys, and attachment drafts", () => {
    window.localStorage.setItem(
      MESSAGES_KEY,
      JSON.stringify([{ id: "1", role: "user", content: "નમસ્તે", attachments: [] }]),
    );
    window.localStorage.setItem("askeasy.india.lastLang", "gu");
    window.localStorage.setItem("askeasy.language.override", "gu");
    window.localStorage.setItem("askeasy.draft.composer", "kem cho");
    window.localStorage.setItem("askeasy.attachments.pending", JSON.stringify([{ id: "a" }]));
    window.sessionStorage.setItem("askeasy.india.session", "1");
    window.sessionStorage.setItem("askeasy.draft.voice", "blob");

    // Unrelated keys must survive.
    window.localStorage.setItem("unrelated", "keep-me");
    window.localStorage.setItem(USAGE_KEY, JSON.stringify({ text: 3, media: 0, voice: 0 }));

    resetIndiaModeArtifacts();

    expect(window.localStorage.getItem(MESSAGES_KEY)).toBeNull();
    expect(window.localStorage.getItem("askeasy.india.lastLang")).toBeNull();
    expect(window.localStorage.getItem("askeasy.language.override")).toBeNull();
    expect(window.localStorage.getItem("askeasy.draft.composer")).toBeNull();
    expect(window.localStorage.getItem("askeasy.attachments.pending")).toBeNull();
    expect(window.sessionStorage.getItem("askeasy.india.session")).toBeNull();
    expect(window.sessionStorage.getItem("askeasy.draft.voice")).toBeNull();

    expect(window.localStorage.getItem("unrelated")).toBe("keep-me");
    expect(window.localStorage.getItem(USAGE_KEY)).not.toBeNull();
  });

  it("rewrites persisted settings with indiaMode=false and language='en'", () => {
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        name: "Ravi",
        theme: "dark",
        indiaMode: true,
        language: "gu",
        indiaOnboarded: true,
        isPro: false,
      }),
    );

    resetIndiaModeArtifacts();

    const raw = window.localStorage.getItem(SETTINGS_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.indiaMode).toBe(false);
    expect(parsed.language).toBe("en");
    // Preserved fields:
    expect(parsed.name).toBe("Ravi");
    expect(parsed.theme).toBe("dark");
    expect(parsed.indiaOnboarded).toBe(true);
  });

  it("is a no-op when storage is empty (idempotent + safe)", () => {
    expect(() => resetIndiaModeArtifacts()).not.toThrow();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("tolerates malformed persisted settings without throwing", () => {
    window.localStorage.setItem(SETTINGS_KEY, "{not json");
    expect(() => resetIndiaModeArtifacts()).not.toThrow();
    // Malformed value is left untouched (parse failed early).
    expect(window.localStorage.getItem(SETTINGS_KEY)).toBe("{not json");
  });
});
