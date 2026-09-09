// Browser-side push registration (Firebase Cloud Messaging).
const appId = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID"] as string | undefined;
const vapidKey = import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY"] as string | undefined;

const firebaseConfig = {
  apiKey: import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY"] as string | undefined,
  projectId: import.meta.env["VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID"] as string | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushResult =
  | { status: "registered"; token: string }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" };

/** Call from a click handler — browsers ignore permission requests without a gesture. */
export async function enablePush(): Promise<PushResult> {
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.projectId ||
    !appId ||
    !vapidKey ||
    !firebaseConfig.messagingSenderId
  ) {
    return { status: "not-configured" };
  }

  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  if (!("Notification" in window) || !(await isSupported())) return { status: "unsupported" };
  if (window.top !== window.self) return { status: "open-in-new-tab" };

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const { initializeApp, getApps } = await import("firebase/app");
  const query = new URLSearchParams(firebaseConfig as Record<string, string>).toString();
  const serviceWorkerRegistration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${query}`,
  );
  const app = getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>);
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
  return token ? { status: "registered", token } : { status: "denied" };
}

/** Deletes this device's FCM token so Firebase stops delivering to it. */
export async function disablePush(): Promise<void> {
  if (!firebaseConfig.apiKey || !appId || !firebaseConfig.messagingSenderId) return;
  try {
    const { getMessaging, deleteToken, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return;
    const { initializeApp, getApps } = await import("firebase/app");
    const app = getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>);
    await deleteToken(getMessaging(app));
  } catch {
    // Token may already be gone; nothing else to clean up here.
  }
}

export const PUSH_MESSAGES: Record<Exclude<PushResult["status"], "registered">, string> = {
  "not-configured": "Notifications aren't set up yet.",
  unsupported: "This browser can't show notifications.",
  "open-in-new-tab": "Open AskEasy in its own tab to turn on notifications.",
  denied: "Notifications are blocked — allow them in your browser's site settings.",
};
