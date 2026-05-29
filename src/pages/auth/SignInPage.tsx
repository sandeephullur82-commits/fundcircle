import React, { useState, useEffect } from "react";
import { useSignIn, useUser } from "@clerk/clerk-react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import AuthLayout from "./AuthLayout";

function clerkErrorMessage(err: any): string {
  const code = err?.errors?.[0]?.code || "";
  const long = err?.errors?.[0]?.longMessage || "";
  const short = err?.errors?.[0]?.message || "";

  if (code === "form_password_incorrect") return "Incorrect password. Please try again.";
  if (code === "form_identifier_not_found") return "No account found with that email address.";
  if (code === "form_param_format_invalid") return "Please enter a valid email address.";
  if (code === "too_many_requests") return "Too many attempts. Please wait a moment and try again.";
  if (code === "session_exists") return "You are already signed in.";
  if (code === "user_locked") return "This account has been locked. Please contact support.";

  return long || short || "An unexpected error occurred. Please try again.";
}

export default function SignInPage() {
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userLoaded && isSignedIn) {
      navigate("/router", { replace: true });
    }
  }, [userLoaded, isSignedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn || !setActive || loading) return;
    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate("/router", { replace: true });
        return;
      }

      if (result.status === "needs_first_factor") {
        setError("Email/password authentication is not enabled. Contact your administrator.");
        return;
      }

      if (result.status === "needs_new_password") {
        setError("Your password has expired. Use the forgot password flow to set a new one.");
        return;
      }

      setError("Sign-in returned an unexpected state. Please try again.");
    } catch (err: any) {
      setError(clerkErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {/* Card — dark glassmorphism with strong separation */}
      <div className="rounded-3xl border border-white/[0.14] bg-white/[0.07] p-8 backdrop-blur-2xl shadow-2xl shadow-black/70 ring-1 ring-inset ring-white/[0.05]">
        <div className="mb-7">
          <h2 className="text-[1.6rem] font-bold text-white leading-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-white/85">Sign in to your FundCircle account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/12 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/95">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
              className="w-full rounded-xl border border-white/[0.13] bg-white/[0.07] px-4 py-3 text-sm text-white placeholder-white/50 outline-none transition focus:border-violet-500/70 focus:bg-white/[0.11] focus:ring-2 focus:ring-violet-500/25"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/95">
                Password
              </label>
              <Link
                to="/auth/forgot-password"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/[0.13] bg-white/[0.07] px-4 py-3 pr-11 text-sm text-white placeholder-white/50 outline-none transition focus:border-violet-500/70 focus:bg-white/[0.11] focus:ring-2 focus:ring-violet-500/25"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/75 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition hover:from-violet-500 hover:to-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/65">
          Don&apos;t have an account?{" "}
          <Link
            to="/auth/sign-up"
            className="font-semibold text-violet-400 hover:text-violet-300 transition-colors"
          >
            Create account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
