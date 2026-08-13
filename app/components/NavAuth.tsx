"use client";

import { useEffect, useState } from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabaseClient";

export default function NavAuth() {
  const supabase = createBrowserSupabase();
  const [user, setUser] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (active) setUser(!!data.session);
      });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (active) setUser(!!session);
      }
    );
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  if (user === null) {
    return <div className="nav-auth" />;
  }

  if (user) {
    return (
      <div className="nav-auth">
        <button className="link-btn" onClick={handleSignOut}>
          sign out
        </button>
      </div>
    );
  }

  return (
    <div className="nav-auth">
      <a href="/dashboard?mode=login" className="nav-login">
        Log in
      </a>
      <a href="/dashboard?mode=signup" className="btn btn-sm">
        Create account
      </a>
    </div>
  );
}
