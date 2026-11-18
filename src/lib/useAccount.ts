import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/pro.functions";
import { useAuthUser, type Settings } from "@/lib/askeasy";
import {
  ACCOUNT_REFRESH_EVENT,
  currentPlanCode,
  type AccountSnapshot,
} from "@/lib/account";
import type { LangCode } from "@/lib/i18n";

export function useAccount(
  active: boolean,
  settings: Settings,
  update: (patch: Partial<Settings>) => void,
) {
  const user = useAuthUser();
  const fetchMe = useServerFn(getMe);
  const [snapshot, setSnapshot] = useState<AccountSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydratedUser = useRef<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const refresh = useCallback(async () => {
    if (!user) return null;
    setLoading(true);
    setError(null);
    try {
      const next = (await fetchMe()) as AccountSnapshot;
      setSnapshot(next);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchMe, user]);

  useEffect(() => {
    if (!user) {
      setSnapshot(null);
      hydratedUser.current = null;
      update({ isPro: false });
      return;
    }
    if (active) void refresh();
  }, [active, refresh, update, user]);

  useEffect(() => {
    if (!active || !user) return;
    const onRefresh = () => void refresh();
    window.addEventListener(ACCOUNT_REFRESH_EVENT, onRefresh);
    const channel = supabase
      .channel(`account-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, onRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "askeasy_subscriptions", filter: `user_id=eq.${user.id}` }, onRefresh)
      .subscribe();
    return () => {
      window.removeEventListener(ACCOUNT_REFRESH_EVENT, onRefresh);
      void supabase.removeChannel(channel);
    };
  }, [active, refresh, user]);

  useEffect(() => {
    if (!snapshot || !user) return;
    const planCode = currentPlanCode(snapshot.profile, snapshot.subscription);
    update({ isPro: planCode === "pro" });
    if (hydratedUser.current === user.id) return;
    hydratedUser.current = user.id;

    const current = settingsRef.current;
    const patch: Partial<Settings> = {};
    const remoteName = snapshot.profile.display_name || snapshot.profile.full_name;
    if (remoteName && remoteName !== "Learner") patch.name = remoteName;
    const preferences = snapshot.preferences;
    if (preferences) {
      if (["kid", "teen", "adult", "elder"].includes(preferences.role ?? "")) {
        patch.persona = preferences.role as Settings["persona"];
      }
      if (preferences.tone) {
        patch.warmth = preferences.tone.includes("professional") ? 20 : preferences.tone.includes("focused") ? 45 : preferences.tone.includes("friendly") ? 65 : 85;
      }
      if (preferences.preferred_language) patch.language = preferences.preferred_language as LangCode;
      if (preferences.facts.length) patch.aboutMe = preferences.facts.slice(0, 5);
    }
    if (Object.keys(patch).length) update(patch);
    else if (!current.name && remoteName) update({ name: remoteName });
  }, [snapshot, update, user]);

  const planCode = snapshot ? currentPlanCode(snapshot.profile, snapshot.subscription) : "free";
  const currentPlan = snapshot?.plans.find((plan) => plan.code === planCode) ?? null;

  return {
    user,
    snapshot,
    loading,
    error,
    refresh,
    isPro: planCode === "pro",
    planCode,
    currentPlan,
  };
}
