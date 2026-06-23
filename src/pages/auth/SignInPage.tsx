import React, { useState, useEffect, useRef } from "react";
import { useSignIn, useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertCircle, KeyRound, ShieldOff, Lock } from "lucide-react";
import AuthLayout from "./AuthLayout";

const MAX_ATTEMPTS  = 5;
const COOLDOWN_SEC  = 30;

function friendlySignInError(err: any): string {
  const code = err?.errors?.[0]?.code ?? "";
  switch (code) {
    case "form_password_incorrect":
    case "form_identifier_not_found":
    case "user_not_found":
      return "Incorrect email or password. Please try again.";
    case "too_many_requests":
      return "Too many sign-in attempts. Please wait a moment and try again.";
    case "account_transfer_invalid":
    case "not_allowed_access":
      return "Sign-in is not available for this account. Please contact your administrator.";
    case "session_exists":
      return "";
    case "strategy_for_user_invalid":
      return "Password sign-in is not set up for this account. Use Forgot Password to create one.";
    case "form_param_format_invalid":
      return "Please enter a valid email address.";
    case "form_identifier_missing":
    case "form_param_nil":
      return "Please enter your email and password.";
    case "form_param_nil_password":
      return "Please enter your password.";
    default: {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "";
      if (msg) return msg;
      return "Sign-in failed. Please check your credentials and try again.";
    }
  }
}

function isNoPasswordStrategy(code: string) {
  return code === "strategy_for_user_invalid" || code === "not_allowed_access";
}

export default function SignInPage() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded, signIn, setActive }       = useSignIn();
  const clerk                                  = useClerk();
  const navigate                               = useNavigate();
  const mfaResetAttempted                      = useRef(false);

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaResetting, setMfaResetting] = useState(false);

  const [failCount, setFailCount]       = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLocked = cooldownLeft > 0;

  const startCooldown = () => {
    setCooldownLeft(COOLDOWN_SEC);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldownLeft(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  useEffect(() => {
    if (userLoaded && isSignedIn) navigate("/router", { replace: true });
  }, [userLoaded, isSignedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || !setActive || loading || isLocked) return;

    setError("");
    setNeedsPasswordSetup(false);
    setNeedsMfa(false);
    setLoading(true);

    const identifier = email.trim().toLowerCase();

    try {
      if (isSignedIn) await clerk.signOut();

      const result = await signIn.create({ identifier, password });
      const status = result.status as string;

      if (status === "complete") {
        setFailCount(0);
        if (result.createdSessionId) await setActive({ session: result.createdSessionId });
        navigate("/router", { replace: true });
        return;
      }

      if (result.createdSessionId) {
        setFailCount(0);
        await setActive({ session: result.createdSessionId });
        navigate("/router", { replace: true });
        return;
      }

      if (status === "needs_second_factor") {
        const secondFactors: any[] = (result as any).supportedSecondFactors ?? [];
        const strategies = secondFactors.map((f: any) => f.strategy);

        if (!mfaResetAttempted.current) {
          mfaResetAttempted.current = true;
          setMfaResetting(true);
          try {
            const resetRes = await fetch("/api/clerk/reset-user-mfa", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: identifier }),
            });
            const resetData = await resetRes.json();
            if (resetData.cleared) {
              setMfaResetting(false);
              const retry = await signIn.create({ identifier, password });
              const retryStatus = retry.status as string;
              if (retryStatus === "complete" || retry.createdSessionId) {
                setFailCount(0);
                if (retry.createdSessionId) await setActive({ session: retry.createdSessionId });
                navigate("/router", { replace: true });
                return;
              }
            }
          } catch {}
          setMfaResetting(false);
        }

        setNeedsMfa(true);
        setLoading(false);
        return;
      }

      if (status === "needs_first_factor") {
        const newCount = failCount + 1;
        setFailCount(newCount);
        if (newCount >= MAX_ATTEMPTS) startCooldown();
        setError("Password sign-in is not available for this account. Please contact your administrator.");
        setLoading(false);
        return;
      }

      const newCount = failCount + 1;
      setFailCount(newCount);
      if (newCount >= MAX_ATTEMPTS) startCooldown();
      setError("Sign-in could not be completed. Please try again.");

    } catch (err: any) {
      const code = err?.errors?.[0]?.code ?? "";
      if (code === "session_exists") {
        navigate("/router", { replace: true });
        return;
      }

      if (isNoPasswordStrategy(code)) {
        setNeedsPasswordSetup(true);
        setError("Password sign-in is not set up for this account. Use Forgot Password to create one.");
        setLoading(false);
        return;
      }

      const message = friendlySignInError(err);
      setError(message);

      const newCount = failCount + 1;
      setFailCount(newCount);
      if (newCount >= MAX_ATTEMPTS) startCooldown();
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/[0.13] bg-white/[0.07] px-4 py-3 text-sm text-white placeholder-white/50 outline-none transition focus:border-violet-500/70 focus:bg-white/[0.11] focus:ring-2 focus:ring-violet-500/25 disabled:opacity-60";

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-white/[0.14] bg-white/[0.07] p-8 backdrop-blur-2xl shadow-2xl shadow-black/70 ring-1 ring-inset ring-white/[0.05]">
        <div className="mb-7">
          <h2 className="text-[1.6rem] font-bold text-white leading-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-white/70">Sign in to your FundCircle account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Rate limit lockout ─────────────────────────────────────────── */}
          {isLocked && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.09] px-4 py-3 flex items-center gap-3">
              <Lock className="h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-200">Too many failed attempts</p>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Please wait <span className="font-bold">{cooldownLeft}s</span> before trying again.
                </p>
              </div>
            </div>
          )}

          {/* ── MFA auto-fix in progress ───────────────────────────────────── */}
          {mfaResetting && (
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.08] px-4 py-3 flex items-center gap-3">
              <Loader2 className="h-4 w-4 shrink-0 text-violet-400 animate-spin" />
              <p className="text-sm text-violet-200">Verifying account configuration…</p>
            </div>
          )}

          {/* ── MFA required — simplified message ─────────────────────────── */}
          {needsMfa && !mfaResetting && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.09] px-4 py-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldOff className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-amber-200">Additional verification required</p>
                  <p className="mt-0.5 text-xs text-amber-300/80">
                    Your account requires multi-factor authentication which is not supported in this app.
                    Please contact your administrator to resolve this.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setNeedsMfa(false); mfaResetAttempted.current = false; }}
                className="w-full rounded-lg border border-amber-500/20 bg-amber-500/[0.07] py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/[0.14] transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* ── Error block ────────────────────────────────────────────────── */}
          {error && !needsMfa && !isLocked && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/12 px-4 py-3 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <span className="text-sm text-red-300">{error}</span>
              </div>
              {needsPasswordSetup && (
                <div className="ml-6 flex items-center gap-2 pt-1">
                  <KeyRound className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-300">
                    <Link
                      to="/auth/forgot-password"
                      className="font-semibold text-amber-200 underline underline-offset-2 hover:text-white transition-colors"
                    >
                      Click here to set up your password.
                    </Link>
                  </p>
                </div>
              )}
              {failCount >= 2 && failCount < MAX_ATTEMPTS && (
                <p className="ml-6 text-[11px] text-white/35">
                  {MAX_ATTEMPTS - failCount} attempt{MAX_ATTEMPTS - failCount !== 1 ? "s" : ""} remaining before temporary lockout.
                </p>
              )}
            </div>
          )}

          {/* ── Email ─────────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); if (error) setError(""); }}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
              inputMode="email"
              disabled={loading || isLocked}
              className={inputClass}
            />
          </div>

          {/* ── Password ──────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/70">
                Password
              </label>
              <Link
                to="/auth/forgot-password"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                tabIndex={-1}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); if (error) setError(""); }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={loading || isLocked}
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                tabIndex={-1}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={loading || isLocked}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>
            ) : isLocked ? (
              <>
                <Lock className="h-4 w-4" />Locked ({cooldownLeft}s)
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
