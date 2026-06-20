import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Eye, EyeOff, RefreshCw, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  userEmail: string;
  onSuccess?: () => void;
  onCancel: () => void;
}

export default function ChangePasswordForm({ onSuccess, onCancel }: Props) {
  const { user } = useUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full h-10 pl-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 " +
    "bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 transition-colors";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    if (!user) {
      setError("Not authenticated.");
      return;
    }

    setSaving(true);
    try {
      await user.updatePassword({ currentPassword, newPassword });
      setDone(true);
      toast.success("Password updated successfully!");
      setTimeout(() => onSuccess?.(), 1200);
    } catch (err: any) {
      const code = err?.errors?.[0]?.code ?? "";
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? "Failed to update password.";
      if (code === "form_password_incorrect") {
        setError("Current password is incorrect.");
      } else if (code === "form_password_pwned" || code === "form_password_size_check_failed") {
        setError("Please choose a stronger password (min. 8 characters, not a common password).");
      } else if (code === "too_many_requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">Password updated!</p>
          <p className="text-xs text-slate-500 mt-0.5">Your account is now secured with the new password.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 px-3 py-2.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Current password */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Password</p>
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
            placeholder="Your current password"
            className={inputClass}
          />
          <button type="button" onClick={() => setShowCurrent(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* New password */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">New Password</p>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Min. 8 characters"
            className={inputClass}
          />
          <button type="button" onClick={() => setShowNew(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirm new password */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confirm New Password</p>
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Re-enter your new password"
            className={inputClass}
          />
          <button type="button" onClick={() => setShowConfirm(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {confirmPassword.length > 0 && (
          <p className={`text-[10px] mt-1 ${newPassword === confirmPassword ? "text-emerald-500" : "text-red-500"}`}>
            {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords don't match"}
          </p>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          className="flex-1 h-10 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {saving ? "Updating…" : "Update Password"}
        </button>
      </div>
    </form>
  );
}
