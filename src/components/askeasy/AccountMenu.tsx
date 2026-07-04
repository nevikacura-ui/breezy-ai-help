import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogIn, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SessionUser = { email?: string; name?: string; avatar?: string } | null;

export function AccountMenu() {
  const [user, setUser] = useState<SessionUser>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) setUser({ email: u.email, name: (u.user_metadata as { full_name?: string } | undefined)?.full_name, avatar: (u.user_metadata as { avatar_url?: string } | undefined)?.avatar_url });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { email: u.email, name: (u.user_metadata as { full_name?: string } | undefined)?.full_name, avatar: (u.user_metadata as { avatar_url?: string } | undefined)?.avatar_url } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (!user) {
    return (
      <button
        onClick={() => navigate({ to: "/auth" })}
        className="glass flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-foreground/80 transition hover:text-foreground"
      >
        <LogIn className="h-3.5 w-3.5" />
        Sign in
      </button>
    );
  }

  const initial = (user.name ?? user.email ?? "U").slice(0, 1).toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-[13px] font-semibold text-foreground/85"
        aria-label="Account"
      >
        {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : initial}
      </button>
      {open && (
        <div className="glass animate-fade-up absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl p-2" style={{ animationDuration: "0.18s" }}>
          <div className="flex items-center gap-2 rounded-xl px-2.5 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-[13px] font-semibold">
              {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full rounded-full object-cover" /> : <User className="h-4 w-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{user.name ?? "You"}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
            </span>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setOpen(false);
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] text-foreground/80 hover:bg-foreground/[0.04]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
