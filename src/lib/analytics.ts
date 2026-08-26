// Lightweight first-party analytics for AskEasy conversion tracking.
// Events are persisted to the backend so funnels (e.g. onboarding) can be measured.

export type AnalyticsEventName =
  | "category_select"
  | "category_deselect"
  | "onboarding_complete";

export interface AnalyticsPayload {
  event: AnalyticsEventName;
  properties?: Record<string, string | number | boolean>;
}

let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    const existing = sessionStorage.getItem("askeasy_analytics_session");
    if (existing) {
      sessionId = existing;
      return existing;
    }
    const fresh = crypto.randomUUID();
    sessionStorage.setItem("askeasy_analytics_session", fresh);
    sessionId = fresh;
    return fresh;
  } catch {
    sessionId = "anonymous";
    return sessionId;
  }
}

export function trackEvent({ event, properties = {} }: AnalyticsPayload): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    event,
    properties,
    session_id: getSessionId(),
    path: window.location.pathname,
    at: new Date().toISOString(),
  });
  // Fire-and-forget; never block UI on analytics.
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/public/analytics", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/public/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}
