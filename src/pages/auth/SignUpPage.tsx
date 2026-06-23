import React, { useState, useEffect, useRef } from "react";
import { useSignUp, useUser } from "@clerk/clerk-react";
import { useNavigate, useLocation, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import AuthLayout from "./AuthLayout";

function recordOtpSent(type: "signup_verify" | "reset_password") {
  const sentAt = new Date().toISOString();
  sessionStorage.setItem("fc_otp_sent_at", sentAt);
  sessionStorage.setItem("fc_otp_type", type);
  sessionStorage.removeItem("fc_otp_verified_at");
  sessionStorage.removeItem("fc_otp_errors");
  const count = parseInt(sessionStorage.getItem("fc_otp_request_count") || "0") + 1;
  sessionStorage.setItem("fc_otp_request_count", String(count));
}

function friendlySignUpError(code: string, fallback: string): string {
  switch (code) {
    case "form_identifier_exists":
      return "An account with this email already exists. Please sign in instead.";
    case "form_param_format_invalid":
    case "form_identifier_invalid":
      return "Please enter a valid email address.";
    case "too_many_requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "form_password_pwned":
    case "form_password_size_check_failed":
    case "form_password_length_too_short":
      return "Please choose a stronger password (at least 8 characters, avoid common passwords).";
    case "form_param_nil":
    case "form_param_missing":
      return "Please fill in all required fields.";
    default:
      return "Sign-up could not be completed. Please try again.";
  }
}

export default function SignUpPage() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchParams] = useSearchParams();

  const invitationTicket = searchParams.get("__clerk_ticket") || "";
  const isEditingEmail = (location.state as any)?.editingEmail === true;
  const submittingRef = useRef(false);

  const [firstName, setFirstName]             = useState("");
  const [lastName, setLastName]               = useState("");
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [agreedToTerms, setAgreedToTerms]     = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");

  useEffect(() => {
    if (userLoaded && isSignedIn) navigate("/router", { replace: true });
  }, [userLoaded, isSignedIn, navigate]);

  useEffect(() => {
    if (!isLoaded) return;
    if (submittingRef.current) return;
    if (isEditingEmail) return;

    if (signUp?.status === "complete" && signUp.createdSessionId && setActive) {
      setActive({ session: signUp.createdSessionId }).then(() => {
        navigate("/auth/callback", { replace: true });
      });
      return;
    }

    if (signUp?.status === "missing_requirements" && signUp.id) {
      if (signUp.unverifiedFields?.includes("email_address")) {
        const otpCount = parseInt(sessionStorage.getItem("fc_otp_request_count") || "0");
        if (otpCount > 0) {
          sessionStorage.setItem("fc_signup_email", signUp.emailAddress || "");
          navigate("/auth/verify-email", { replace: true });
        }
      }
    }
  }, [isLoaded, signUp?.status, signUp?.id, signUp?.createdSessionId, isEditingEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp || loading) return;
    setError("");

    if (!invitationTicket && !firstName.trim()) { setError("First name is required."); return; }
    if (!invitationTicket && !lastName.trim())  { setError("Last name is required."); return; }
    if (!invitationTicket && !email.trim())     { setError("Email address is required."); return; }
    if (password.length < 8)                    { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword)           { setError("Passwords do not match."); return; }
    if (!invitationTicket && !agreedToTerms) {
      setError("Please accept the terms and conditions to continue.");
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      if (invitationTicket) {
        const result = await signUp.create({
          strategy: "ticket",
          ticket: invitationTicket,
          password,
          firstName: firstName || undefined,
          lastName:  lastName  || undefined,
        });

        if (result.status === "complete" && result.createdSessionId) {
          await setActive!({ session: result.createdSessionId });
          sessionStorage.removeItem("fc_signup_email");
          navigate("/auth/callback", { replace: true });
          return;
        }

        if (result.status === "missing_requirements") {
          if (result.unverifiedFields?.includes("email_address")) {
            await result.prepareEmailAddressVerification({ strategy: "email_code" });
            recordOtpSent("signup_verify");
            sessionStorage.setItem("fc_signup_email", result.emailAddress || "");
            navigate("/auth/verify-email", { replace: true });
          }
          return;
        }

        setError("Unable to complete sign-up. Please try again.");
        return;
      }

      const emailKey = email.trim().toLowerCase();
      const created = await signUp.create({ emailAddress: emailKey, password, firstName, lastName });

      if (created.status === "complete" && created.createdSessionId) {
        await setActive!({ session: created.createdSessionId });
        navigate("/auth/callback", { replace: true });
        return;
      }

      try {
        await created.prepareEmailAddressVerification({ strategy: "email_code" });
      } catch {
        setError("Could not send verification email. Please try again.");
        return;
      }

      recordOtpSent("signup_verify");
      sessionStorage.setItem("fc_signup_email", emailKey);
      navigate("/auth/verify-email", { replace: true });

    } catch (err: any) {
      const code = err?.errors?.[0]?.code ?? "unknown";
      setError(friendlySignUpError(code, err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || ""));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/[0.13] bg-white/[0.07] px-4 py-3 text-sm text-white placeholder-white/50 outline-none transition focus:border-violet-500/70 focus:bg-white/[0.11] focus:ring-2 focus:ring-violet-500/25 disabled:opacity-60";
  const labelClass = "block text-[11px] font-semibold uppercase tracking-wider text-white/70";

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-white/[0.14] bg-white/[0.07] p-8 backdrop-blur-2xl shadow-2xl shadow-black/70 ring-1 ring-inset ring-white/[0.05]">
        <div className="mb-7">
          {invitationTicket ? (
            <>
              <h2 className="text-[1.6rem] font-bold text-white leading-tight">Accept your invitation</h2>
              <p className="mt-1.5 text-sm text-white/70">Set a password to join your organization on FundCircle</p>
            </>
          ) : (
            <>
              <h2 className="text-[1.6rem] font-bold text-white leading-tight">Create your account</h2>
              <p className="mt-1.5 text-sm text-white/70">Start managing your savings circle today</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/12 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {!invitationTicket && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelClass}>First name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Raj"
                  required
                  autoFocus
                  disabled={loading}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>Last name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Kumar"
                  required
                  disabled={loading}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {!invitationTicket && (
            <div className="space-y-1.5">
              <label className={labelClass}>Email address <span className="text-red-400">*</span></label>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="you@example.com"
                required
                disabled={loading}
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Password <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 chars"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Confirm <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {!invitationTicket && (
            <label className="flex cursor-pointer items-start gap-3 pt-1">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-white/10 accent-violet-500"
              />
              <span className="text-sm text-white/70 leading-relaxed">
                I agree to the{" "}
                <Link to="/terms" target="_blank" className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" target="_blank" className="text-violet-400 hover:text-violet-300 transition-colors underline underline-offset-2">
                  Privacy Policy
                </Link>
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {invitationTicket ? "Joining organization…" : "Creating account…"}
              </>
            ) : (
              invitationTicket ? "Join organization" : "Create account"
            )}
          </button>
        </form>

        {!invitationTicket && (
          <p className="mt-6 text-center text-sm text-white/50">
            Already have an account?{" "}
            <Link to="/auth/sign-in" className="font-semibold text-violet-400 hover:text-violet-300 transition-colors">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
