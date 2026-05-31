import React, { useState, useEffect, useRef } from "react";
import { useSignUp, useSignIn, useUser, useOrganizationList } from "@clerk/clerk-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertCircle, Mail, KeyRound, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import AuthLayout from "./AuthLayout";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TICKET_SESSION_KEY = "fc_invite_ticket";

function clerkErrMsg(err: any): string {
  const code = err?.errors?.[0]?.code ?? "";
  const long = err?.errors?.[0]?.longMessage ?? "";
  const short = err?.errors?.[0]?.message ?? "";
  if (code === "form_password_too_short") return "Password must be at least 8 characters.";
  if (code === "form_password_pwned") return "That password is too common. Please choose a stronger one.";
  if (code === "form_identifier_exists") return "An account with that email already exists. Use 'I already have an account' below.";
  if (code === "session_exists") return "__SESSION_EXISTS__";
  if (code === "ticket_expired") return "This invitation link has expired. Ask your administrator to resend it.";
  if (code === "ticket_invalid") return "This invitation link is invalid or has already been used.";
  if (code === "not_allowed_access") return "Access denied. Your account may be suspended.";
  return long || short || code || "Something went wrong. Please try again.";
}

type Mode = "new-user" | "existing-user";
type Phase = "loading" | "no-ticket" | "auto-accepting" | "form";

// ─── Component ────────────────────────────────────────────────────────────────
export default function AcceptInvitationPage() {
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { isLoaded: signUpLoaded, signUp, setActive: signUpSetActive } = useSignUp();
  const { isLoaded: signInLoaded, signIn, setActive: signInSetActive } = useSignIn();
  const { setActive: orgSetActive } = useOrganizationList();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const didAutoAccept = useRef(false);

  // ── Read ticket from URL (and persist to sessionStorage) ────────────────────
  const ticketFromUrl = searchParams.get("__clerk_ticket") ?? "";
  const ticket = ticketFromUrl || sessionStorage.getItem(TICKET_SESSION_KEY) || "";

  const [phase, setPhase] = useState<Phase>("loading");
  const [mode, setMode] = useState<Mode>("new-user");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Persist ticket to sessionStorage the moment we see it
  useEffect(() => {
    if (ticketFromUrl) {
      sessionStorage.setItem(TICKET_SESSION_KEY, ticketFromUrl);
      console.log("[FC AcceptInvite] Ticket persisted to sessionStorage —", ticketFromUrl.substring(0, 24) + "…");
    }
  }, [ticketFromUrl]);

  const isLoaded = userLoaded && signUpLoaded && signInLoaded;

  // ── Determine phase once Clerk is ready ─────────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    console.log("════════════════════════════════════════════════");
    console.log("[FC AcceptInvite] Page initialised");
    console.log("[FC AcceptInvite]   ticket present :", !!ticket, ticket ? `(${ticket.substring(0, 20)}…)` : "");
    console.log("[FC AcceptInvite]   isSignedIn     :", isSignedIn);
    console.log("[FC AcceptInvite]   userId         :", user?.id ?? "none");
    console.log("════════════════════════════════════════════════");

    if (!ticket) {
      console.warn("[FC AcceptInvite] No ticket in URL or sessionStorage — showing error");
      setPhase("no-ticket");
      return;
    }

    if (isSignedIn && user) {
      // Already signed in — auto-consume the ticket to join the org
      console.log("[FC AcceptInvite] User already signed in — auto-consuming ticket…");
      setPhase("auto-accepting");
    } else {
      // Not signed in — show the form
      console.log("[FC AcceptInvite] User not signed in — showing invitation form");
      setPhase("form");
    }
  }, [isLoaded, isSignedIn, user?.id, ticket]);

  // ── Auto-accept for already-signed-in users ─────────────────────────────────
  useEffect(() => {
    if (phase !== "auto-accepting" || didAutoAccept.current) return;
    if (!signIn || !signInSetActive) return;
    didAutoAccept.current = true;

    const run = async () => {
      console.log("[FC AcceptInvite] Auto-accept: calling signIn.create({ strategy: 'ticket' })…");
      try {
        const result = await signIn.create({ strategy: "ticket", ticket });
        console.log("[FC AcceptInvite] Auto-accept result — status:", result.status, "| sessionId:", result.createdSessionId ?? "null");

        if (result.status === "complete") {
          if (result.createdSessionId && signInSetActive) {
            console.log("[FC AcceptInvite] Auto-accept ✓ — activating new session:", result.createdSessionId);
            await signInSetActive({ session: result.createdSessionId });
          } else {
            console.log("[FC AcceptInvite] Auto-accept ✓ — status=complete, session already active");
          }
          sessionStorage.removeItem(TICKET_SESSION_KEY);
          console.log("[FC AcceptInvite] → Navigating to /auth/callback");
          navigate("/auth/callback", { replace: true });
          return;
        }

        // Unexpected status — fall through to org invitation page
        console.warn("[FC AcceptInvite] Auto-accept unexpected status:", result.status, "— falling back to /organization/invitation");
        navigate("/organization/invitation", { replace: true });
      } catch (err: any) {
        const msg = clerkErrMsg(err);
        console.error("[FC AcceptInvite] Auto-accept error:", err?.errors?.[0]?.code, msg);

        if (msg === "__SESSION_EXISTS__" || err?.errors?.[0]?.code === "session_exists") {
          console.log("[FC AcceptInvite] Session already exists — routing to /organization/invitation");
          navigate("/organization/invitation", { replace: true });
          return;
        }

        if (
          err?.errors?.[0]?.code === "already_a_member_in_organization" ||
          err?.errors?.[0]?.code === "invitation_already_accepted"
        ) {
          console.log("[FC AcceptInvite] Already a member — routing to /router");
          sessionStorage.removeItem(TICKET_SESSION_KEY);
          navigate("/router", { replace: true });
          return;
        }

        // Ticket issue — show the form so user can try manually
        console.warn("[FC AcceptInvite] Auto-accept failed — showing form as fallback");
        setPhase("form");
        setError(msg);
      }
    };

    run();
  }, [phase, signIn, signInSetActive, ticket, navigate]);

  // ── New-user submit (password setup via ticket) ──────────────────────────────
  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp || !signUpSetActive || loading) return;
    setError("");

    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || undefined;
    const lastName = nameParts.slice(1).join(" ") || undefined;

    setLoading(true);
    console.log("════════════════════════════════════════════════");
    console.log("[FC AcceptInvite NEW] ▶ signUp.create({ strategy: 'ticket' })");
    console.log("[FC AcceptInvite NEW]   firstName:", firstName ?? "(not provided)");
    console.log("[FC AcceptInvite NEW]   lastName :", lastName ?? "(not provided)");
    console.log("[FC AcceptInvite NEW]   ticket   :", ticket.substring(0, 24) + "…");
    console.log("════════════════════════════════════════════════");

    try {
      const result = await signUp.create({
        strategy: "ticket",
        ticket,
        password,
        firstName,
        lastName,
      });

      console.log("[FC AcceptInvite NEW] signUp.create result:");
      console.log("[FC AcceptInvite NEW]   status          :", result.status);
      console.log("[FC AcceptInvite NEW]   createdSessionId:", result.createdSessionId ?? "null");
      console.log("[FC AcceptInvite NEW]   emailAddress    :", result.emailAddress ?? "—");
      console.log("[FC AcceptInvite NEW]   unverifiedFields:", result.unverifiedFields ?? []);

      if (result.status === "complete" && result.createdSessionId) {
        console.log("[FC AcceptInvite NEW] ✓ Account created — activating session:", result.createdSessionId);
        await signUpSetActive({ session: result.createdSessionId });
        sessionStorage.removeItem(TICKET_SESSION_KEY);
        console.log("[FC AcceptInvite NEW] → Navigating to /auth/callback");
        navigate("/auth/callback", { replace: true });
        return;
      }

      // Missing requirements (e.g. email verification still needed)
      if (result.status === "missing_requirements") {
        console.log("[FC AcceptInvite NEW] missing_requirements — unverified:", result.unverifiedFields);
        if (result.unverifiedFields?.includes("email_address")) {
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          sessionStorage.setItem("fc_signup_email", result.emailAddress || "");
          navigate("/auth/verify-email", { replace: true });
        }
        return;
      }

      console.error("[FC AcceptInvite NEW] Unexpected status:", result.status);
      setError("Unexpected sign-up state. Please try again or contact support.");
    } catch (err: any) {
      const code = err?.errors?.[0]?.code ?? "";
      const msg = clerkErrMsg(err);
      console.error("[FC AcceptInvite NEW] ✗ Error — code:", code, "| msg:", msg, err);

      // If the email already has an account, switch to existing-user mode
      if (code === "form_identifier_exists" || code === "identifier_already_signed_in") {
        setMode("existing-user");
        setError("This email already has a FundCircle account. Please use the 'I already have an account' option below.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Existing-user submit (ticket sign-in — no password needed) ───────────────
  const handleExistingUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn || !signInSetActive || loading) return;
    setError("");
    setLoading(true);

    console.log("════════════════════════════════════════════════");
    console.log("[FC AcceptInvite EXISTING] ▶ signIn.create({ strategy: 'ticket' })");
    console.log("[FC AcceptInvite EXISTING]   ticket:", ticket.substring(0, 24) + "…");
    console.log("════════════════════════════════════════════════");

    try {
      const result = await signIn.create({ strategy: "ticket", ticket });

      console.log("[FC AcceptInvite EXISTING] signIn.create result:");
      console.log("[FC AcceptInvite EXISTING]   status          :", result.status);
      console.log("[FC AcceptInvite EXISTING]   createdSessionId:", result.createdSessionId ?? "null");

      if (result.status === "complete") {
        if (result.createdSessionId) {
          console.log("[FC AcceptInvite EXISTING] ✓ Signed in — activating session:", result.createdSessionId);
          await signInSetActive({ session: result.createdSessionId });
        } else {
          console.log("[FC AcceptInvite EXISTING] ✓ status=complete, session already active");
        }
        sessionStorage.removeItem(TICKET_SESSION_KEY);
        console.log("[FC AcceptInvite EXISTING] → Navigating to /auth/callback");
        navigate("/auth/callback", { replace: true });
        return;
      }

      // Needs first factor (password) — fall back to sign-in page preserving ticket
      console.warn("[FC AcceptInvite EXISTING] Ticket not sufficient — status:", result.status);
      setError("Could not sign in with this invitation link. Please sign in manually and then check your invitations.");
    } catch (err: any) {
      const code = err?.errors?.[0]?.code ?? "";
      const msg = clerkErrMsg(err);
      console.error("[FC AcceptInvite EXISTING] ✗ Error — code:", code, "| msg:", msg, err);

      if (
        code === "already_a_member_in_organization" ||
        code === "invitation_already_accepted"
      ) {
        sessionStorage.removeItem(TICKET_SESSION_KEY);
        navigate("/router", { replace: true });
        return;
      }

      setError(msg === "__SESSION_EXISTS__"
        ? "You are already signed in. Redirecting to your dashboard…"
        : msg);

      if (msg === "__SESSION_EXISTS__") {
        setTimeout(() => navigate("/router", { replace: true }), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const inputCls =
    "w-full rounded-xl border border-white/[0.13] bg-white/[0.07] px-4 py-3 text-sm text-white placeholder-white/50 outline-none transition focus:border-violet-500/70 focus:bg-white/[0.11] focus:ring-2 focus:ring-violet-500/25";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-white/95";

  // Loading / auto-accepting spinner
  if (!isLoaded || phase === "loading" || phase === "auto-accepting") {
    return (
      <AuthLayout hideBackButton>
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] px-10 py-12 backdrop-blur-2xl shadow-2xl flex flex-col items-center gap-5">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          <p className="text-sm text-white/50 font-medium">
            {phase === "auto-accepting" ? "Joining your organisation…" : "Loading…"}
          </p>
        </div>
      </AuthLayout>
    );
  }

  // No ticket — show helpful error
  if (phase === "no-ticket") {
    return (
      <AuthLayout>
        <div className="rounded-3xl border border-white/[0.14] bg-white/[0.07] p-8 backdrop-blur-2xl shadow-2xl shadow-black/70 ring-1 ring-inset ring-white/[0.05] space-y-5">
          <div className="flex flex-col items-center gap-3 text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Invalid invitation link</h2>
            <p className="text-sm text-white/65 leading-relaxed">
              This link is missing the invitation token. Make sure you clicked the
              full link from your email, or ask your administrator to resend the
              invitation.
            </p>
          </div>
          <button
            onClick={() => navigate("/auth/sign-in")}
            className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-semibold transition-all"
          >
            Go to Sign In
          </button>
        </div>
      </AuthLayout>
    );
  }

  // ── Form phase ──────────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <div className="rounded-3xl border border-white/[0.14] bg-white/[0.07] p-8 backdrop-blur-2xl shadow-2xl shadow-black/70 ring-1 ring-inset ring-white/[0.05]">

        {/* Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-violet-300 bg-violet-500/15 px-2.5 py-1 rounded-lg mb-3">
            <Mail className="w-3.5 h-3.5" /> You have been invited
          </div>
          <h2 className="text-[1.6rem] font-bold text-white leading-tight">
            {mode === "new-user" ? "Accept your invitation" : "Sign in to accept"}
          </h2>
          <p className="mt-1.5 text-sm text-white/75">
            {mode === "new-user"
              ? "Create a password to join your organisation on FundCircle"
              : "Your invitation will be accepted automatically after signing in"}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-white/[0.05] p-1 mb-6 gap-1">
          <button
            type="button"
            onClick={() => { setMode("new-user"); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "new-user"
                ? "bg-violet-600 text-white shadow"
                : "text-white/50 hover:text-white/75"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            New to FundCircle
          </button>
          <button
            type="button"
            onClick={() => { setMode("existing-user"); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              mode === "existing-user"
                ? "bg-violet-600 text-white shadow"
                : "text-white/50 hover:text-white/75"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Already have account
          </button>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/12 px-4 py-3 text-sm text-red-300 mb-4"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {/* ── New user form ── */}
        {mode === "new-user" && (
          <form onSubmit={handleNewUserSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Raj Kumar"
                autoFocus
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelCls}>Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 chars"
                    required
                    autoComplete="new-password"
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75 transition-colors"
                  >
                    {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Confirm</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat"
                    required
                    autoComplete="new-password"
                    className={`${inputCls} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Joining organisation…</> : "Join organisation"}
            </button>
          </form>
        )}

        {/* ── Existing user form ── */}
        {mode === "existing-user" && (
          <form onSubmit={handleExistingUserSubmit} className="space-y-5">
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3.5 text-sm text-blue-200 leading-relaxed">
              Your invitation ticket will sign you in automatically — <strong className="text-white">no password needed</strong>. This only works if you're signing in with the same email the invitation was sent to.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</> : "Accept invitation & sign in"}
            </button>

            <p className="text-center text-xs text-white/45">
              Invitation sent to the wrong email?{" "}
              <button
                type="button"
                onClick={() => navigate("/auth/sign-in")}
                className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2"
              >
                Sign in manually
              </button>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}
