import React, { useState, useEffect } from "react";
import { useSignUp, useUser } from "@clerk/clerk-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import AuthLayout from "./AuthLayout";

export default function SignUpPage() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Clerk puts the invitation token here when the user clicks an invite link
  const invitationTicket = searchParams.get("__clerk_ticket") || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect already-signed-in users
  useEffect(() => {
    if (userLoaded && isSignedIn) {
      console.log("[FC SignUp] User already signed in — redirecting to /router");
      navigate("/router", { replace: true });
    }
  }, [userLoaded, isSignedIn, navigate]);

  // If an invitation ticket is present, log it for debugging
  useEffect(() => {
    if (invitationTicket) {
      console.log("[FC SignUp] Invitation ticket detected in URL:", invitationTicket.substring(0, 20) + "…");
    }
  }, [invitationTicket]);

  // If there's an existing incomplete signUp (e.g. from a previous attempt), handle it
  useEffect(() => {
    if (!isLoaded) return;
    if (signUp?.status === "complete" && signUp.createdSessionId && setActive) {
      console.log("[FC SignUp] Already-complete signUp detected — activating session and redirecting");
      setActive({ session: signUp.createdSessionId }).then(() => {
        navigate("/auth/callback", { replace: true });
      });
      return;
    }
    if (signUp?.status === "missing_requirements" && signUp.id) {
      console.log("[FC SignUp] Existing incomplete signUp detected (status: missing_requirements) — resuming email verification");
      if (signUp.unverifiedFields?.includes("email_address")) {
        sessionStorage.setItem("fc_signup_email", signUp.emailAddress || "");
        navigate("/auth/verify-email", { replace: true });
      }
    }
  }, [isLoaded, signUp?.status, signUp?.id, signUp?.createdSessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp || loading) return;
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!invitationTicket && !agreedToTerms) {
      setError("Please accept the terms and conditions to continue.");
      return;
    }

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    setLoading(true);
    try {
      if (invitationTicket) {
        // ── Invitation flow ──────────────────────────────────────────────────
        // Must pass the ticket so Clerk links the account to the organisation.
        // Email is pre-filled by Clerk when the ticket is present.
        console.log("[FC SignUp] Creating account via invitation ticket…");
        const result = await signUp.create({
          strategy: "ticket",
          ticket: invitationTicket,
          password,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        });
        console.log("[FC SignUp] signUp.create() (invitation) status:", result.status);

        if (result.status === "complete" && result.createdSessionId) {
          console.log("[FC SignUp] Invitation sign-up complete — activating session:", result.createdSessionId);
          await setActive!({ session: result.createdSessionId });
          sessionStorage.removeItem("fc_signup_email");
          console.log("[FC SignUp] Invitation accepted — navigating to /auth/callback");
          navigate("/auth/callback", { replace: true });
          return;
        }

        if (result.status === "missing_requirements") {
          console.log("[FC SignUp] Invitation sign-up needs email verification — unverified:", result.unverifiedFields);
          if (result.unverifiedFields?.includes("email_address")) {
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            sessionStorage.setItem("fc_signup_email", result.emailAddress || "");
            navigate("/auth/verify-email", { replace: true });
          }
          return;
        }

        console.error("[FC SignUp] Unexpected invitation sign-up status:", result.status);
        setError("Invitation sign-up returned an unexpected state. Please try again.");
        return;
      }

      // ── Normal sign-up flow ────────────────────────────────────────────────
      console.log("[FC SignUp] Creating account for:", email.trim().toLowerCase());
      await signUp.create({
        emailAddress: email.trim().toLowerCase(),
        password,
        firstName,
        lastName,
      });
      console.log("[FC SignUp] signUp.create() done, status:", signUp.status);
      console.log("[FC SignUp] Preparing email address verification…");
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      sessionStorage.setItem("fc_signup_email", email.trim().toLowerCase());
      navigate("/auth/verify-email", { replace: true });

    } catch (err: any) {
      console.error("[FC SignUp] Exception during signUp.create():", err);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "Could not create account. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/[0.13] bg-white/[0.07] px-4 py-3 text-sm text-white placeholder-white/50 outline-none transition focus:border-violet-500/70 focus:bg-white/[0.11] focus:ring-2 focus:ring-violet-500/25";

  const labelClass = "block text-[11px] font-semibold uppercase tracking-wider text-white/95";

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-white/[0.14] bg-white/[0.07] p-8 backdrop-blur-2xl shadow-2xl shadow-black/70 ring-1 ring-inset ring-white/[0.05]">
        <div className="mb-7">
          {invitationTicket ? (
            <>
              <h2 className="text-[1.6rem] font-bold text-white leading-tight">Accept your invitation</h2>
              <p className="mt-1.5 text-sm text-white/85">Set a password to join your organization on FundCircle</p>
            </>
          ) : (
            <>
              <h2 className="text-[1.6rem] font-bold text-white leading-tight">Create your account</h2>
              <p className="mt-1.5 text-sm text-white/85">Start managing your savings circle today</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/12 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Name is always useful; in invitation flow it pre-fills from Clerk but let them confirm */}
          <div className="space-y-1.5">
            <label className={labelClass}>Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Raj Kumar"
              required={!invitationTicket}
              autoFocus
              className={inputClass}
            />
          </div>

          {/* Email is only shown on regular sign-up; invitation ticket pre-fills it server-side */}
          {!invitationTicket && (
            <div className="space-y-1.5">
              <label className={labelClass}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 chars"
                  required
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>Confirm</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat"
                  required
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Terms only shown for regular sign-up, not invitation flow */}
          {!invitationTicket && (
            <label className="flex cursor-pointer items-start gap-3 pt-1">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-white/10 accent-violet-500"
              />
              <span className="text-sm text-white/75 leading-relaxed">
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
          <p className="mt-6 text-center text-sm text-white/65">
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
