import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Eye, EyeOff, Loader2, ArrowLeft, RefreshCw,
  ShieldCheck, CheckCircle2,
} from "lucide-react";
import AuthLayout from "./AuthLayout";

export default function ResetPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const loadingRef = useRef(false);
  const email = sessionStorage.getItem("fc_reset_email") || "";

  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (!email) navigate("/auth/forgot-password", { replace: true });
  }, [email, navigate]);

  // Countdown before resend is available
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // Auto-redirect after success
  useEffect(() => {
    if (!success) return;
    if (redirectCountdown <= 0) {
      navigate("/auth/sign-in", { replace: true });
      return;
    }
    const t = setTimeout(() => setRedirectCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [success, redirectCountdown, navigate]);

  // ── OTP input handlers ──────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length > 0) {
      const filled = [...otp];
      digits.split("").forEach((d, i) => { if (i < 6) filled[i] = d; });
      setOtp(filled);
      inputRefs.current[Math.min(digits.length, 5)]?.focus();
    }
  };

  // ── Resend ──────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!isLoaded || !signIn || countdown > 0 || !email || resending) return;
    setResending(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setOtp(["", "", "", "", "", ""]);
      setError("");
      setCountdown(30);
      inputRefs.current[0]?.focus();
      toast.success("New verification code sent.");
    } catch (err: any) {
      const code = err?.errors?.[0]?.code ?? "";
      if (code === "too_many_requests") {
        toast.error("Too many attempts. Please wait before requesting a new code.");
      } else {
        toast.error("Failed to resend. Please go back and try again.");
      }
    } finally {
      setResending(false);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const performReset = useCallback(async (code: string) => {
    if (!isLoaded || !signIn || loadingRef.current) return;
    if (code.length !== 6) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      if ((result.status as string) === "complete") {
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        sessionStorage.removeItem("fc_reset_email");
        setSuccess(true);
      } else {
        setError("Could not complete password reset. Please try again.");
      }
    } catch (err: any) {
      const errCode = err?.errors?.[0]?.code ?? "";
      if (errCode === "too_many_requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (
        errCode === "form_password_pwned" ||
        errCode === "form_password_size_check_failed" ||
        errCode === "form_password_length_too_short"
      ) {
        setError("Please choose a stronger password (min. 8 characters, avoid common passwords).");
      } else if (
        errCode === "form_code_incorrect" ||
        errCode === "incorrect_code"
      ) {
        setError("Invalid code. Please check the code and try again.");
      } else if (
        errCode === "verification_expired" ||
        errCode === "form_code_expired"
      ) {
        setError("This code has expired. Please request a new one.");
      } else {
        setError("Invalid or expired code. Please request a new one.");
      }
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signIn, setActive, newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performReset(otp.join(""));
  };

  // Auto-submit when all 6 digits entered and passwords are valid
  useEffect(() => {
    const code = otp.join("");
    if (
      code.length === 6 &&
      !loadingRef.current &&
      isLoaded && signIn &&
      newPassword.length >= 8 &&
      newPassword === confirmPassword
    ) {
      const t = setTimeout(() => performReset(code), 120);
      return () => clearTimeout(t);
    }
  }, [otp, isLoaded, signIn, newPassword, confirmPassword, performReset]);

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout hideBackButton>
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-2xl shadow-2xl shadow-black/50 text-center">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-[1.6rem] font-bold text-white leading-tight">
                Password Updated Successfully
              </h2>
              <p className="mt-2 text-sm text-white/45">
                Your password has been changed successfully.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/auth/sign-in", { replace: true })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-blue-500"
          >
            Go To Sign In
          </button>

          <p className="mt-4 text-xs text-white/30">
            Redirecting in {redirectCountdown}s…
          </p>
        </div>
      </AuthLayout>
    );
  }

  // ── Reset Form ──────────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-2xl shadow-2xl shadow-black/50">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-600/25 to-blue-600/25">
            <ShieldCheck className="h-6 w-6 text-violet-400" />
          </div>
          <h2 className="text-[1.6rem] font-bold text-white leading-tight">Reset your password</h2>
          <p className="mt-1.5 text-sm text-white/45">
            Enter the code sent to{" "}
            {email && <span className="font-semibold text-white/70">{email}</span>}
            {" "}and choose a new password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* OTP Input */}
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Verification code
            </label>
            <div className="flex items-center justify-center gap-2.5" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  autoComplete="one-time-code"
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-12 w-11 rounded-xl border border-white/[0.12] bg-white/[0.07] text-center text-xl font-bold text-white outline-none transition focus:border-violet-500/70 focus:bg-white/[0.11] focus:ring-2 focus:ring-violet-500/25 caret-violet-400"
                />
              ))}
            </div>
            <div className="text-center pt-0.5">
              {countdown > 0 ? (
                <p className="text-xs text-white/30">Resend Code in {countdown}s</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
                  {resending ? "Sending…" : "Resend Code"}
                </button>
              )}
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                className="w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 pr-11 text-sm text-white placeholder-white/25 outline-none transition focus:border-violet-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-violet-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Confirm new password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                className="w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 pr-11 text-sm text-white placeholder-white/25 outline-none transition focus:border-violet-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-violet-500/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Updating password…</>
            ) : (
              "Update Password"
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/auth/forgot-password"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
