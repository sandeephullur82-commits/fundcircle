import { useState, useEffect } from "react";
import { useSignIn } from "@clerk/clerk-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandLogo";
import { Link } from "react-router-dom";

export default function SetupPasswordPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
    } else {
      setTokenValid(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn.create({
        strategy: "ticket",
        ticket: token,
      });

      if (result.status === "complete" || result.createdSessionId) {
        if (setActive) {
          await setActive({ session: result.createdSessionId });
        }

        await (signIn as any).update?.({ password });

        toast.success("Password set! Signing you in…");
        navigate("/auth/callback", { replace: true });
        return;
      }

      toast.error("Unable to verify your setup link. It may have expired.");
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        "Failed to set password";
      console.error("[FC SetupPassword] Error:", msg, err);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 text-center backdrop-blur-2xl">
          <ShieldCheck className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-white mb-2">Invalid Setup Link</h1>
          <p className="text-sm text-white/50 mb-6">
            This link is missing a token. Please ask your administrator for a new setup link.
          </p>
          <Link
            to="/auth/sign-in"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4 relative overflow-x-hidden">
      <div className="pointer-events-none absolute -top-48 -left-40 h-[650px] w-[650px] rounded-full bg-violet-700/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-40 h-[550px] w-[550px] rounded-full bg-blue-600/18 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <Link to="/" className="flex flex-col items-center gap-2">
            <BrandMark size={48} />
            <div className="text-center">
              <p className="text-lg font-bold text-white tracking-tight">FundCircle</p>
              <p className="text-[11px] text-white/35 font-medium tracking-[0.15em] uppercase">Micro-Savings Platform</p>
            </div>
          </Link>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] px-8 py-8 backdrop-blur-2xl shadow-2xl shadow-black/50 space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-lg mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Account Setup
            </div>
            <h1 className="text-xl font-bold text-white">Set your password</h1>
            <p className="text-sm text-white/50">
              Create a password to complete your FundCircle account setup.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.08] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Repeat your password"
                  className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.06] px-4 pr-10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.08] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirm && password !== confirm && (
                <p className="text-xs text-red-400">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !password || !confirm || password !== confirm}
              className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Setting up account…</>
              ) : (
                "Set Password & Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/30">
          Already have an account?{" "}
          <Link to="/auth/sign-in" className="text-violet-400 hover:text-violet-300 font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
