import React, { useState } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, ArrowLeft, KeyRound } from "lucide-react";
import AuthLayout from "./AuthLayout";

export default function ForgotPasswordPage() {
  const { isLoaded, signIn } = useSignIn();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || loading) return;
    setError("");
    setLoading(true);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email.trim().toLowerCase(),
      });
      sessionStorage.setItem("fc_reset_email", email.trim().toLowerCase());
      setSent(true);
      navigate("/auth/reset-password", { replace: true });
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        "No account found with that email address.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-2xl shadow-2xl shadow-black/50">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-600/25 to-blue-600/25">
            <KeyRound className="h-6 w-6 text-violet-400" />
          </div>
          <h2 className="text-[1.6rem] font-bold text-white leading-tight">Forgot password?</h2>
          <p className="mt-1.5 text-sm text-white/45">
            Enter your email and we'll send you a reset code
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-violet-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending reset code…
              </>
            ) : (
              "Send reset code"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/auth/sign-in"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
