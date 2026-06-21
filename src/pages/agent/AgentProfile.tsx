import React, { useState, useEffect } from "react";
import { useUser, useOrganization, SignOutButton } from "@clerk/clerk-react";
import { useDocumentRealtime } from "@/lib/firestore-hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LogOut, Mail, Phone, BadgeCheck, Building2, Wifi, WifiOff,
  RefreshCw, Shield, Eye, EyeOff, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { membershipIdFor } from "@/lib/services";
import { toast } from "sonner";

function safeN(v: any) { const n = Number(v); return isFinite(n) ? n : 0; }

// ── Inline Change Password (Clerk user.updatePassword) ───────────────────────
function ChangePasswordSection() {
  const { user } = useUser();
  const [open,        setOpen]        = useState(false);
  const [currentPwd,  setCurrentPwd]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  const reset = () => {
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setErrors({}); setShowCurrent(false); setShowNew(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!currentPwd)        errs.current  = "Current password is required.";
    if (newPwd.length < 8)  errs.newPwd   = "New password must be at least 8 characters.";
    if (newPwd !== confirmPwd) errs.confirm = "Passwords do not match.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      await (user as any)?.updatePassword({ currentPassword: currentPwd, newPassword: newPwd });
      toast.success("Password updated successfully!");
      reset();
      setOpen(false);
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.message || "Failed to update password.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => { setOpen(!open); if (open) reset(); }}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
            <Shield className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-900">Change Password</p>
            <p className="text-xs text-slate-400">Update your account password</p>
          </div>
        </div>
        <div className={`w-6 h-6 flex items-center justify-center text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-3">
          {/* Current Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter current password"
                className={`w-full h-11 px-3 pr-10 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                  errors.current
                    ? "border-red-400 bg-red-50 focus:ring-red-400/30"
                    : "border-slate-200 bg-slate-50 focus:ring-emerald-400/30 focus:border-emerald-400"
                }`}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                {showCurrent ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
            {errors.current && <p className="text-[11px] text-red-500">{errors.current}</p>}
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Min 8 characters"
                className={`w-full h-11 px-3 pr-10 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                  errors.newPwd
                    ? "border-red-400 bg-red-50 focus:ring-red-400/30"
                    : "border-slate-200 bg-slate-50 focus:ring-emerald-400/30 focus:border-emerald-400"
                }`}
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2">
                {showNew ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
            {errors.newPwd && <p className="text-[11px] text-red-500">{errors.newPwd}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="Repeat new password"
              className={`w-full h-11 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                errors.confirm
                  ? "border-red-400 bg-red-50 focus:ring-red-400/30"
                  : "border-slate-200 bg-slate-50 focus:ring-emerald-400/30 focus:border-emerald-400"
              }`}
            />
            {errors.confirm && <p className="text-[11px] text-red-500">{errors.confirm}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? "Updating…" : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Logout Confirmation ───────────────────────────────────────────────────────
function LogoutSection() {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="w-full h-12 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    );
  }
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <p className="text-sm text-red-700 font-medium">
          Are you sure you want to sign out? Any unsynced offline data will be lost.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirm(false)}
          className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-sm"
        >
          Cancel
        </button>
        <SignOutButton>
          <button className="flex-1 h-10 rounded-xl bg-red-600 text-white font-semibold text-sm flex items-center justify-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}

// ── Sync Status ───────────────────────────────────────────────────────────────
function SyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncMsg,  setSyncMsg]  = useState<string | null>(null);

  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  setSyncMsg("Back online — syncing data…"); setTimeout(() => setSyncMsg(null), 5000); };
    const onOffline = () => { setIsOnline(false); setSyncMsg("You're offline. Collections will sync when reconnected."); };
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${
      isOnline
        ? "bg-emerald-50 border-emerald-100"
        : "bg-amber-50 border-amber-100"
    }`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
        isOnline ? "bg-emerald-100" : "bg-amber-100"
      }`}>
        {isOnline
          ? <Wifi   className="w-4 h-4 text-emerald-600" />
          : <WifiOff className="w-4 h-4 text-amber-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isOnline ? "text-emerald-800" : "text-amber-800"}`}>
          {isOnline ? "Online · Synced" : "Offline"}
        </p>
        <p className={`text-xs mt-0.5 ${isOnline ? "text-emerald-600" : "text-amber-600"}`}>
          {syncMsg || (isOnline
            ? "All data is up to date with Firestore."
            : "Collections saved offline. Will sync when online.")}
        </p>
      </div>
      {isOnline && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
    </div>
  );
}

// ── Main More/Profile Page ────────────────────────────────────────────────────
export default function AgentProfile() {
  const { user }         = useUser();
  const { organization } = useOrganization();

  const agentId = user?.id    || "";
  const orgId   = organization?.id || "";

  const { data: membershipDoc } = useDocumentRealtime<any>(
    "organizationMembers",
    user && organization ? membershipIdFor(organization.id, user.id) : null
  );

  const shortId = agentId ? `FC-${agentId.slice(-6).toUpperCase()}` : "—";

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* ── Profile Card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Green banner */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 h-16" />

        <div className="px-5 pb-5 -mt-8">
          <Avatar className="h-16 w-16 ring-4 ring-white shadow-lg">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-black">
              {user?.firstName?.charAt(0) || "A"}
            </AvatarFallback>
          </Avatar>

          <div className="mt-3 mb-4">
            <p className="text-xl font-black text-slate-900">{user?.fullName || "Agent"}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600">Verified Collector</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {user?.primaryEmailAddress?.emailAddress && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-700 truncate">
                  {user.primaryEmailAddress.emailAddress}
                </span>
              </div>
            )}
            {membershipDoc?.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-700">{membershipDoc.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <BadgeCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500 font-mono">{shortId} · Agent</span>
            </div>
            {organization && (
              <div className="flex items-center gap-2.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-700 truncate">{organization.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sync Status ───────────────────────────────────────────────────── */}
      <SyncStatus />

      {/* ── Security ──────────────────────────────────────────────────────── */}
      <ChangePasswordSection />

      {/* ── Sign Out ──────────────────────────────────────────────────────── */}
      <LogoutSection />

      {/* Bottom spacer for mobile nav */}
      <div className="h-2" />
    </div>
  );
}
