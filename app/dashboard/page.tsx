"use client";

import { useEffect, useState, useCallback } from "react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { createBrowserSupabase } from "@/lib/supabaseClient";
import { PLANS, PAID_PLAN_IDS, type PlanId } from "@/lib/pricing";
import PayPalButton from "@/app/components/PayPalButton";

type AuthMode = "login" | "signup";

function Speedo({
  score,
  label,
  confidence,
}: {
  score: number | null;
  label: string | null;
  confidence: string | null;
}) {
  const target = score ?? 0;
  const [val, setVal] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const pct = Math.max(0, Math.min(100, val));
  const r = 80;
  const cx = 100;
  const cy = 102;
  const circ = Math.PI * r;
  const filled = (pct / 100) * circ;
  const needleRot = -90 + (pct / 100) * 180;

  return (
    <div className="speedo">
      <svg viewBox="0 0 200 140" role="img" aria-label="ai score gauge">
        <defs>
          <linearGradient id="speedo-rainbow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="18%" stopColor="#22c55e" />
            <stop offset="38%" stopColor="#84cc16" />
            <stop offset="58%" stopColor="#eab308" />
            <stop offset="78%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(246,236,218,0.10)"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#speedo-rainbow)"
          strokeWidth="15"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
        <g transform={`rotate(${needleRot} ${cx} ${cy})`}>
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r + 20}
            stroke="#f6ecda"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <circle cx={cx} cy={cy} r="6" fill="#f6ecda" />
        <text x={cx} y={cy + 34} textAnchor="middle" className="speedo-num">
          {Math.round(pct)}%
        </text>
      </svg>
      <div className="speedo-cap">
        {label
          ? `${label.replace(/-/g, " ")}${confidence ? " · " + confidence : ""}`
          : "ai score"}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const supabase = createBrowserSupabase();

  const [checkingSession, setCheckingSession] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    if (typeof window !== "undefined") {
      const mode = new URLSearchParams(window.location.search).get("mode");
      if (mode === "signup" || mode === "login") return mode;
    }
    return "login";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [plan, setPlan] = useState<PlanId | null>(null);
  const [payMsg, setPayMsg] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const [yourMessage, setYourMessage] = useState("");
  const [theirMessage, setTheirMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiLabel, setAiLabel] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<string | null>(null);
  const [aiLog, setAiLog] = useState<string | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      setCheckingSession(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, s: Session | null) => {
        setSession(s);
      }
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setPlan(null);
      return;
    }
    setPlan(null);
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }: { data: { plan: string | null } | null }) => {
        setPlan((data?.plan as PlanId) || "free");
      });
  }, [session?.user?.id]);

  const handleAuth = useCallback(async () => {
    setAuthError(null);
    setAuthMsg(null);
    if (!email.includes("@") || password.length < 6) {
      setAuthError("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    if (authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthError(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) setAuthError(error.message);
      else if (!data.session) {
        setAuthMsg("Check your inbox for a confirmation link, then log in.");
      }
    }
  }, [authMode, email, password, supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function generateReply() {
    setLoading(true);
    setError(null);
    const conversation = [
      yourMessage.trim() ? `You: ${yourMessage.trim()}` : null,
      theirMessage.trim() ? `Them: ${theirMessage.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      const res = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("Your session expired — please log in again.");
          await supabase.auth.signOut();
          return;
        }
        setError(
          res.status === 429
            ? "You've hit today's limit. Pick a plan below for more room."
            : data.error || "Something went wrong."
        );
        return;
      }
      setReply(data.reply);
      setRemaining(data.remaining);
      setCopied(false);
      setLiked(false);
      setAiEnabled(data.aiEnabled ?? false);
      setAiScore(data.aiScore ?? null);
      setAiLabel(data.aiLabel ?? null);
      setAiConfidence(data.aiConfidence ?? null);
      setAiLog(data.detectLog ?? null);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    if (!yourMessage.trim() && !theirMessage.trim()) {
      setError("Paste at least one message to work from.");
      return;
    }
    if (!reply) {
      setAiEnabled(false);
      setAiScore(null);
      setAiLabel(null);
      setAiConfidence(null);
    }
    generateReply();
  }

  function resetReply() {
    setReply(null);
    setCopied(false);
    setLiked(false);
    setAiEnabled(false);
    setAiScore(null);
    setAiLabel(null);
    setAiConfidence(null);
    setAiLog(null);
    setError(null);
  }

  function handlePaid(planId: PlanId) {
    setPlan(planId);
    setPayMsg(`You're on the ${PLANS[planId].name} plan now — welcome.`);
    setPayError(null);
  }

  async function handleCopy() {
    if (!reply) return;
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the text manually.");
    }
  }

  async function recheckAi() {
    if (!reply || aiChecking) return;
    setAiChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/check-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Recheck failed.");
        return;
      }
      setAiEnabled(data.aiEnabled ?? false);
      setAiScore(data.aiScore ?? null);
      setAiLabel(data.aiLabel ?? null);
      setAiConfidence(data.aiConfidence ?? null);
      setAiLog(data.log ?? null);
    } catch {
      setError("Network error — try again.");
    } finally {
      setAiChecking(false);
    }
  }

  function handlePayError(message: string) {
    setPayMsg(null);
    setPayError(message);
  }

  if (checkingSession) {
    return <main style={{ padding: "60px 0" }} className="lede">loading…</main>;
  }

  if (!session) {
    return (
      <main style={{ padding: "40px 0" }}>
        <div className="eyebrow">step one</div>
        <h1 style={{ fontSize: 34 }}>Sign in to write</h1>
        <p className="lede">Your account keeps your daily count fair. Free to start.</p>

        <div className="login-card fade-up">
          <div className="auth-tabs">
            <button
              className={authMode === "login" ? "tab active" : "tab"}
              onClick={() => { setAuthMode("login"); setAuthError(null); setAuthMsg(null); }}
            >
              Log in
            </button>
            <button
              className={authMode === "signup" ? "tab active" : "tab"}
              onClick={() => { setAuthMode("signup"); setAuthError(null); setAuthMsg(null); }}
            >
              Create account
            </button>
          </div>

          <h2>{authMode === "login" ? "Welcome back" : "Make an account"}</h2>
          <p>
            {authMode === "login"
              ? "Same email and password as always."
              : "Your password is handled by Supabase — we never see it."}
          </p>

          <label className="field-label">email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <label className="field-label">password</label>
          <input
            type="password"
            placeholder="at least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={authMode === "login" ? "current-password" : "new-password"}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAuth();
            }}
          />

          <div style={{ marginTop: 20 }}>
            <button className="btn" onClick={handleAuth}>
              {authMode === "login" ? "Log in" : "Create account"}
            </button>
          </div>
          {authMsg && <p className="ok-text">{authMsg}</p>}
          {authError && <p className="error-text">{authError}</p>}
        </div>
      </main>
    );
  }

  const limitText = plan === "unlimited" ? "unlimited" : plan ? PLANS[plan].dailyLimit : "…";
  const planLabel = plan ? PLANS[plan].name : "…";

  return (
    <main className="dash" style={{ padding: "40px 0" }}>
      <div className="meta-row">
        <span className="plan-badge">{planLabel} — {limitText} / day</span>
        <button className="link-btn" onClick={handleSignOut}>sign out</button>
      </div>

      <div className="eyebrow">the notebook</div>
      <h1 style={{ fontSize: 34 }}>What did they say?</h1>
      <p className="lede">Paste the conversation so far. The more recent messages, the sharper the suggestion.</p>

      <div className="dash-split">
        <div className="dash-left">
          <label>your last message <span className="opt">optional</span></label>
          <textarea
            placeholder="What you said..."
            value={yourMessage}
            onChange={(e) => { setYourMessage(e.target.value); resetReply(); }}
          />
          <div className="char-count">{yourMessage.length} chars</div>

          <label>their reply <span className="opt">optional</span></label>
          <textarea
            placeholder="What they said back..."
            value={theirMessage}
            onChange={(e) => { setTheirMessage(e.target.value); resetReply(); }}
          />
          <div className="char-count">{theirMessage.length} chars</div>
        </div>

        <div className="dash-center">
          <button className="btn center-btn" onClick={handleGenerate} disabled={loading}>
            {loading ? "writing…" : reply ? "Regenerate" : "Reply"}
          </button>
          {remaining !== null && (
            <div className="center-remaining">{remaining} left today</div>
          )}
        </div>

        <div className="dash-right">
          {error && <p className="error-text">{error}</p>}

          {reply ? (
            <div className="fade-up">
              <div className="note">
                <button className="stamp" onClick={handleCopy} aria-label="copy reply" title="copy reply">
                  {copied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f6ecda" strokeWidth="2">
                      <path d="M4 12l5 5L20 6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="#f6ecda" strokeWidth="2">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V5a2 2 0 012-2h10" />
                    </svg>
                  )}
                </button>
                {reply}
              </div>

              <div className={"reply-count" + (reply.length >= 70 ? "" : " short")}>
                {reply.length} chars
                <span className="reply-count-min">
                  {reply.length >= 70 ? "· min 70 met" : "· below 70 minimum"}
                </span>
              </div>

              <Speedo score={aiScore} label={aiLabel} confidence={aiConfidence} />

              {!aiEnabled && aiScore === null && (
                <div className="ai-score dim" style={{ marginTop: 10, justifyContent: "center" }}>
                  ai score · unlimited plan only
                </div>
              )}

              <div className="right-actions">
                <button className="link-btn" onClick={handleCopy}>
                  {copied ? "copied ✓" : "copy"}
                </button>
                <button className="link-btn" onClick={() => setLiked((v) => !v)}>
                  {liked ? "liked ✓" : "like"}
                </button>
                <button className="link-btn" onClick={recheckAi} disabled={aiChecking}>
                  {aiChecking ? "checking…" : "recheck ai"}
                </button>
              </div>

              {aiLog && (
                <div className="ai-log" style={{ marginTop: 12 }}>
                  <span className="ai-log-text">{aiLog}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="dash-placeholder">
              Your reply will appear here once you hit Reply.
            </div>
          )}
        </div>
      </div>

      <hr className="divider" />

      <section>
        <div className="eyebrow">plans</div>
        <h2 style={{ fontSize: 30, margin: "8px 0 6px" }}>More room to write</h2>
        <p className="lede">
          One-time, no subscription. Pick a pace and keep your streak going.
        </p>

        {payMsg && <p className="ok-text">{payMsg}</p>}
        {payError && <p className="error-text">{payError}</p>}

        <div className="pricing">
          <div className={"price-card" + (plan === "free" ? " current" : "")}>
            <div className="price-name">free</div>
            <div className="price-amount">$0</div>
            <div className="price-blurb">{PLANS.free.blurb}</div>
            <div className="price-note">{plan === "free" ? "your plan" : "to start"}</div>
          </div>

          {PAID_PLAN_IDS.map((pid) => (
            <div className={"price-card" + (plan === pid ? " current" : "")} key={pid}>
              <div className="price-name">{PLANS[pid].name.toLowerCase()}</div>
              <div className="price-amount">${PLANS[pid].price}</div>
              <div className="price-blurb">{PLANS[pid].blurb}</div>
              {plan === pid ? (
                <div className="price-note">your plan</div>
              ) : paypalClientId ? (
                <PayPalButton
                  plan={pid}
                  clientId={paypalClientId}
                  onSuccess={handlePaid}
                  onError={handlePayError}
                />
              ) : (
                <div className="price-note">payments not configured yet</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
