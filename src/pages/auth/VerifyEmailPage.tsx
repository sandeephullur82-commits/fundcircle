import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSignUp } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Mail, RefreshCw, Pencil } from "lucide-react";
import AuthLayout from "./AuthLayout";

const OTP_LENGTH = 6;

function markOtpSent() {
  sessionStorage.setItem("fc_otp_sent_at", new Date().toISOString());
  sessionStorage.removeItem("fc_otp_verified_at");
  const count = parseInt(sessionStorage.getItem("fc_otp_request_count") || "0") + 1;
  sessionStorage.setItem("fc_otp_request_count", String(count));
  console.log("[FC OTP] ✉ OTP resent | request_count:", count);
}

export default function VerifyEmailPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();

  const [otp, setOtp]         = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError]     = useState("");
  const [countdown, setCountdown] = useState(30);

  const inputRefs    = useRef<(HTMLInputElement | null)[]>([]);
  const verifyingRef = useRef(false);
  // Stores the createdSessionId returned directly from attemptEmailAddressVerification
  // so the verification_already_verified recovery path always has a non-null value.
  const lastSessionIdRef = useRef<string | null>(null);

  const email      = sessionStorage.getItem("fc_signup_email") || "";
  const allFilled  = otp.length === OTP_LENGTH && [...otp].every(c => /\d/.test(c));

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // ── Guard: no active signUp session ──────────────────────────────────────
  // BUG FIX: Added `verifyingRef.current` check before calling doComplete().
  // Without this, when performVerify() successfully calls
  // attemptEmailAddressVerification(), Clerk reactively updates signUp.status
  // to "complete", which re-fires this effect while performVerify is still
  // awaiting completeSignUp(). That caused two concurrent setActive() calls —
  // the second one threw client_state_invalid, which surfaced as a bogus
  // "Verification failed" error to the user.
  useEffect(() => {
    if (!isLoaded) return;

    if (!signUp?.id) {
      console.warn("[FC Verify] No active signUp session — redirecting to /auth/sign-up");
      navigate("/auth/sign-up", { replace: true });
      return;
    }

    const otpCount = parseInt(sessionStorage.getItem("fc_otp_request_count") || "0");
    if (otpCount === 0 && signUp.status === "missing_requirements") {
      console.warn("[FC Verify] OTP not yet sent — redirecting to /auth/sign-up");
      sessionStorage.setItem("fc_verify_error", "Verification code could not be sent. Please try again.");
      navigate("/auth/sign-up", { replace: true });
      return;
    }

    if (signUp.status === "complete") {
      // FIX: If performVerify is actively running, it will call completeSignUp()
      // itself once attemptEmailAddressVerification() resolves. Do NOT fire
      // doComplete() here — that would be a duplicate and would cause a double
      // setActive() call which throws on the second invocation.
      if (verifyingRef.current) {
        console.log(
          "[FC Verify] signUp.status=complete detected BUT verifyingRef=true — " +
          "deferring to performVerify (skipping doComplete to prevent double setActive)"
        );
        return;
      }

      // Safe path: component mounted with an already-completed signup (e.g. page
      // refresh after verification succeeded but navigation failed).
      console.log(
        "[FC Verify] signUp already complete on mount — " +
        "sessionId:", signUp.createdSessionId ?? "null",
        "| lastSessionIdRef:", lastSessionIdRef.current ?? "null"
      );

      const doComplete = async () => {
        const sid = signUp.createdSessionId ?? lastSessionIdRef.current ?? null;
        console.log("[FC Verify] doComplete (mount recovery) — effective sessionId:", sid ?? "null");
        if (sid && setActive) {
          try {
            console.log("[FC Verify] doComplete ▶ setActive({ session:", sid, "})");
            await setActive({ session: sid });
            console.log("[FC Verify] doComplete ✓ setActive() — Executed: Yes, Success: Yes");
          } catch (err: any) {
            const code = err?.errors?.[0]?.code ?? err?.code ?? "unknown";
            console.warn("[FC Verify] doComplete ⚠ setActive() error (treating as non-fatal):", code);
          }
        } else {
          console.warn("[FC Verify] doComplete — no sessionId available; session may already be active");
        }
        sessionStorage.removeItem("fc_signup_email");
        navigate("/auth/callback", { replace: true });
      };

      doComplete();
    }
  }, [isLoaded, signUp?.status, signUp?.id, signUp?.createdSessionId]);

  // ── Pick up error from guard redirect ────────────────────────────────────
  useEffect(() => {
    const stored = sessionStorage.getItem("fc_verify_error");
    if (stored) {
      sessionStorage.removeItem("fc_verify_error");
      setError(stored);
    }
  }, []);

  // ── Shared completion helper ──────────────────────────────────────────────
  // BUG FIXES applied here:
  //   1. Guard is now `if (sessionId && setActive)` — prevents TypeError when
  //      setActive is undefined (possible in some Clerk states).
  //   2. setActive() is wrapped in try/catch — if it throws (e.g. session
  //      already activated, client_state_invalid), we log and continue rather
  //      than surfacing a confusing error to the user.
  //   3. The function never silently swallows the error for truly unknown
  //      Clerk error codes — those are re-thrown so the caller can show a
  //      meaningful message.
  const completeSignUp = useCallback(async (sessionId: string | null, sentAt: string | null) => {
    console.log("════════════════════════════════════════════════");
    console.log("[FC Verify] ▶ STEP 3: completeSignUp() — Executed: Yes");
    console.log("[FC Verify]   sessionId (arg)             :", sessionId ?? "null");
    console.log("[FC Verify]   lastSessionIdRef.current    :", lastSessionIdRef.current ?? "null");
    console.log("[FC Verify]   signUp.status               :", signUp?.status ?? "unknown");
    console.log("[FC Verify]   signUp.createdSessionId     :", signUp?.createdSessionId ?? "null");
    console.log("[FC Verify]   setActive is                :", typeof setActive);
    console.log("════════════════════════════════════════════════");

    const verifiedAt = new Date().toISOString();
    sessionStorage.setItem("fc_otp_verified_at", verifiedAt);
    if (sentAt) {
      const ms = new Date(verifiedAt).getTime() - new Date(sentAt).getTime();
      console.log("[FC OTP] ✓ Verified | delivery_ms:", ms);
    }

    // Use the best available session ID: arg → lastSessionIdRef → hook value
    const effectiveSessionId =
      sessionId ??
      lastSessionIdRef.current ??
      signUp?.createdSessionId ??
      null;

    console.log("[FC Verify] STEP 3 effective sessionId:", effectiveSessionId ?? "null (setActive will be skipped)");

    if (effectiveSessionId && setActive) {
      console.log("[FC Verify] ▶ STEP 4: setActive({ session:", effectiveSessionId, "}) — Executed: Yes");
      try {
        await setActive({ session: effectiveSessionId });
        console.log("[FC Verify] ✓ STEP 4: setActive() — Success: Yes, session is now active");
      } catch (err: any) {
        const code = err?.errors?.[0]?.code ?? err?.code ?? "unknown";
        const msg  = err?.errors?.[0]?.longMessage ?? err?.message ?? "unknown";
        console.error("[FC Verify] ✗ STEP 4: setActive() — Success: No");
        console.error("[FC Verify]   error code    :", code);
        console.error("[FC Verify]   error message :", msg);
        console.error("[FC Verify]   full error    :", JSON.stringify(err, null, 2));

        // Non-fatal: these codes mean the session is already active
        const nonFatalCodes = [
          "client_state_invalid",
          "session_exists",
          "already_signed_in",
          "single_session_mode_violated",
        ];
        if (nonFatalCodes.includes(code)) {
          console.warn("[FC Verify] ⚠ STEP 4: setActive error treated as non-fatal — session likely already active, continuing to callback");
        } else {
          // Unknown error — surface to user
          console.error("[FC Verify] ✗ STEP 4: Unknown setActive error — aborting completeSignUp");
          throw err;
        }
      }
    } else if (!effectiveSessionId) {
      console.warn("[FC Verify] ⚠ STEP 4: setActive() — Executed: No (no sessionId available)");
      console.warn("[FC Verify]   Clerk may have activated the session internally. Continuing to /auth/callback.");
    } else {
      console.warn("[FC Verify] ⚠ STEP 4: setActive() — Executed: No (setActive is undefined/null)");
    }

    sessionStorage.removeItem("fc_signup_email");

    console.log("[FC Verify] ▶ STEP 5: navigate('/auth/callback') — Executed: Yes");
    navigate("/auth/callback", { replace: true });
  }, [setActive, navigate, signUp?.status, signUp?.createdSessionId]);

  // ── Verify ────────────────────────────────────────────────────────────────
  const performVerify = useCallback(async (code: string) => {
    if (!isLoaded || !signUp) return;
    if (verifyingRef.current) {
      console.log("[FC Verify] ⚠ already in-flight — skipped");
      return;
    }

    console.log("════════════════════════════════════════════════");
    console.log("[FC Verify] ▶ STEP 1: performVerify()");
    console.log("  OTP entered            :", code);
    console.log("  OTP length             :", code.length);
    console.log("  signUp.status          :", signUp.status);
    console.log("  signUp.id              :", signUp.id ?? "null");
    console.log("  signUp.unverifiedFields:", signUp.unverifiedFields ?? []);
    console.log("  signUp.createdSessionId:", signUp.createdSessionId ?? "null");
    console.log("════════════════════════════════════════════════");

    if (code.length !== OTP_LENGTH) { setError("Please enter all 6 digits."); return; }
    setError("");
    verifyingRef.current = true;
    setLoading(true);

    const sentAt      = sessionStorage.getItem("fc_otp_sent_at");
    const verifyStart = Date.now();

    try {
      console.log("[FC Verify] ▶ STEP 2: attemptEmailAddressVerification({ code })");
      const result = await signUp.attemptEmailAddressVerification({ code });

      console.log("[FC Verify] ✓ STEP 2: attemptEmailAddressVerification() — Executed: Yes");
      console.log("[FC Verify]   Success            :", result.status === "complete" ? "Yes" : "No");
      console.log("[FC Verify]   result.status      :", result.status);
      console.log("[FC Verify]   createdSessionId   :", result.createdSessionId ?? "null");
      console.log("[FC Verify]   unverifiedFields   :", result.unverifiedFields ?? []);
      console.log("[FC Verify]   api_took           :", `${Date.now() - verifyStart}ms`);

      // BUG FIX: Persist the createdSessionId from the API response immediately.
      // This is the canonical value — the hook's signUp.createdSessionId can be
      // null by the time the verification_already_verified catch path runs.
      if (result.createdSessionId) {
        lastSessionIdRef.current = result.createdSessionId;
        console.log("[FC Verify] ✓ lastSessionIdRef set to:", result.createdSessionId);
      }

      if (result.status === "complete") {
        console.log("[FC Verify] ✓ Verification complete — proceeding to completeSignUp");
        await completeSignUp(result.createdSessionId, sentAt);
      } else {
        console.warn("[FC Verify] ✗ Unexpected verification status:", result.status);
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      const errCode = err?.errors?.[0]?.code ?? "unknown";
      const msg     = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? "unknown";

      console.error("════════════════════════════════════════════════");
      console.error("[FC Verify] ✗ STEP 2: attemptEmailAddressVerification() FAILED — Executed: Yes, Success: No");
      console.error("[FC Verify]   error code    :", errCode);
      console.error("[FC Verify]   error message :", msg);
      console.error("[FC Verify]   full error    :", JSON.stringify(err, null, 2));
      console.error("════════════════════════════════════════════════");

      if (errCode === "verification_already_verified") {
        // BUG FIX: Use lastSessionIdRef (set from the API response) instead of
        // signUp.createdSessionId (from hook). The hook value is null after Clerk
        // internally completes the signup, causing setActive to be skipped.
        // Previously this sent the user to /auth/callback with no active session,
        // leading to a 5s timeout and redirect to /auth/sign-in.
        const recoverySessionId = lastSessionIdRef.current ?? signUp.createdSessionId ?? null;
        console.log(
          "[FC Verify] ⚠ verification_already_verified — recovering.",
          "| recoverySessionId:", recoverySessionId ?? "null",
          "| signUp.status:", signUp.status,
          "| signUp.createdSessionId (hook):", signUp.createdSessionId ?? "null"
        );
        await completeSignUp(recoverySessionId, sentAt);
        return;
      }

      if (errCode === "too_many_requests")
        setError("Too many attempts. Please wait a moment and try again.");
      else if (errCode === "verification_expired")
        setError("Code expired. Please request a new one.");
      else
        setError(`Verification failed: [${errCode}] ${msg}`);

      setOtp("");
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
    } finally {
      verifyingRef.current = false;
      setLoading(false);
    }
  }, [isLoaded, signUp, completeSignUp]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    performVerify(otp);
  };

  // ── Auto-submit when all 6 digits filled ─────────────────────────────────
  useEffect(() => {
    if (!allFilled || verifyingRef.current || !isLoaded || !signUp) return;
    const t = setTimeout(() => performVerify(otp), 300);
    return () => clearTimeout(t);
  }, [otp, allFilled, isLoaded, signUp, performVerify]);

  // ── OTP string helpers ────────────────────────────────────────────────────
  const setCharAt = (str: string, index: number, char: string): string => {
    const arr = Array.from({ length: OTP_LENGTH }, (_, i) => str[i] ?? "");
    arr[index] = char;
    let result = arr.join("");
    while (result.length > 0 && result[result.length - 1] === "") {
      result = result.slice(0, -1);
    }
    return result;
  };

  const clearCharAt = (str: string, index: number): string => {
    const arr = Array.from({ length: OTP_LENGTH }, (_, i) => str[i] ?? "");
    arr[index] = "";
    let result = arr.join("");
    while (result.length > 0 && result[result.length - 1] === "") {
      result = result.slice(0, -1);
    }
    return result;
  };

  // ── Keyboard handler ──────────────────────────────────────────────────────
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (otp[index]) {
        setOtp(prev => clearCharAt(prev, index));
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === "Delete") {
      e.preventDefault();
      setOtp(prev => clearCharAt(prev, index));
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (index > 0) inputRefs.current[index - 1]?.focus();
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
      return;
    }
  };

  // ── Change handler ────────────────────────────────────────────────────────
  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw    = e.target.value;
    const digits = raw.replace(/\D/g, "");

    if (digits.length === 0) {
      if (otp[index]) {
        setOtp(prev => clearCharAt(prev, index));
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (digits.length > 1) {
      const arr = Array.from({ length: OTP_LENGTH }, (_, i) => otp[i] ?? "");
      [...digits].forEach((d, offset) => {
        if (index + offset < OTP_LENGTH) arr[index + offset] = d;
      });
      setOtp(arr.join("").slice(0, OTP_LENGTH));
      const focusAt = Math.min(index + digits.length, OTP_LENGTH - 1);
      setTimeout(() => inputRefs.current[focusAt]?.focus(), 0);
      return;
    }

    setOtp(prev => setCharAt(prev, index, digits));
    if (index < OTP_LENGTH - 1) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    }
  };

  // ── Paste handler ─────────────────────────────────────────────────────────
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;
    const arr = Array.from({ length: OTP_LENGTH }, (_, i) => digits[i] ?? "");
    setOtp(arr.join("").slice(0, OTP_LENGTH));
    setTimeout(() => inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus(), 0);
  };

  // ── Resend ────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!isLoaded || !signUp || countdown > 0 || resending) return;
    setResending(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      markOtpSent();
      setOtp("");
      setError("");
      setCountdown(30);
      setTimeout(() => inputRefs.current[0]?.focus(), 0);
      toast.success("A new code has been sent to your email.");
    } catch (err: any) {
      const msg  = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? String(err);
      const code = err?.errors?.[0]?.code ?? "resend_failed";
      console.error("[FC Verify] Resend failed | code:", code, "| msg:", msg);
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // ── Edit email ────────────────────────────────────────────────────────────
  const handleEditEmail = () => {
    sessionStorage.removeItem("fc_otp_request_count");
    sessionStorage.removeItem("fc_otp_sent_at");
    sessionStorage.removeItem("fc_otp_type");
    sessionStorage.removeItem("fc_verify_error");
    navigate("/auth/sign-up", { replace: true, state: { editingEmail: true } });
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const boxBase =
    "h-14 w-12 rounded-xl border-2 bg-white/[0.07] text-center text-2xl font-bold text-white " +
    "outline-none transition-all duration-150 caret-violet-400 select-none " +
    "sm:h-16 sm:w-14 sm:text-3xl";

  const boxIdle    = "border-white/20 hover:border-white/35";
  const boxFilled  = "border-violet-500 bg-white/[0.10] shadow-[0_0_0_3px_rgba(139,92,246,0.18)]";
  const boxFocused = "focus:border-violet-400 focus:bg-white/[0.12] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.25)]";

  return (
    <AuthLayout hideBackButton>
      <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-2xl shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-600/30 to-blue-600/30 shadow-lg shadow-violet-900/20">
            <Mail className="h-7 w-7 text-violet-300" />
          </div>
          <h2 className="text-[1.75rem] font-bold text-white leading-tight tracking-tight">
            Check your email
          </h2>
          <p className="mt-2 text-sm text-white/50">We sent a 6-digit code to</p>
          <button
            type="button"
            onClick={handleEditEmail}
            className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 transition hover:bg-white/[0.10] hover:border-violet-500/40 group"
            aria-label="Change email address"
          >
            <span className="text-sm font-semibold text-white">{email || "your email"}</span>
            <Pencil className="h-3.5 w-3.5 text-white/40 group-hover:text-violet-400 transition-colors" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 text-center">
              {error}
            </div>
          )}

          {/* OTP boxes */}
          <div
            className="flex items-center justify-center gap-3"
            onPaste={handlePaste}
            role="group"
            aria-label="One-time password input"
          >
            {Array.from({ length: OTP_LENGTH }, (_, i) => {
              const digit = otp[i] ?? "";
              return (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={digit}
                  autoFocus={i === 0}
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                  onFocus={e => e.target.select()}
                  onChange={e => handleChange(i, e)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={[boxBase, digit ? boxFilled : boxIdle, boxFocused].join(" ")}
                />
              );
            })}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !allFilled}
            className={[
              "flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-4 text-base font-semibold text-white shadow-lg transition-all duration-150",
              allFilled && !loading
                ? "bg-gradient-to-r from-violet-600 to-blue-600 shadow-violet-900/40 hover:from-violet-500 hover:to-blue-500 hover:shadow-violet-800/50 hover:scale-[1.01] active:scale-[0.99]"
                : "bg-white/10 cursor-not-allowed opacity-50 shadow-none",
            ].join(" ")}
          >
            {loading
              ? <><Loader2 className="h-5 w-5 animate-spin" />Verifying…</>
              : "Verify email"
            }
          </button>

          {/* Resend */}
          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-white/35">
                Resend code in <span className="font-medium text-white/55">{countdown}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${resending ? "animate-spin" : ""}`} />
                {resending ? "Sending…" : "Resend code"}
              </button>
            )}
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
