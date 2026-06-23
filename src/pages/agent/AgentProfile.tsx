import React, { useState, useEffect } from "react";
import { useUser, useOrganization, SignOutButton } from "@clerk/clerk-react";
import { useDocumentRealtime } from "@/lib/firestore-hooks";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ProfileAvatarEditor from "@/components/ui/ProfileAvatarEditor";
import {
  LogOut, Mail, Phone, BadgeCheck, Building2, Wifi, WifiOff,
  RefreshCw, Shield, Eye, EyeOff, CheckCircle2, AlertTriangle,
  Edit3, Save, X,
} from "lucide-react";
import { membershipIdFor } from "@/lib/services";
import { toast } from "sonner";

const nameRx = /^[A-Za-z\s.]*$/;

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

// ── Inline Profile Editor ─────────────────────────────────────────────────────
function InlineProfileEditor({ membershipId, membershipDoc, userId }: {
  membershipId: string | null;
  membershipDoc: any;
  userId: string;
}) {
  const { user } = useUser();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState<Record<string,string>>({});

  const open = () => {
    setFullName(membershipDoc?.fullName || user?.fullName || "");
    setPhone(membershipDoc?.phone || "");
    setErrors({});
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    const errs: Record<string,string> = {};
    const name = fullName.trim();
    if (!name || name.length < 2) errs.fullName = "Name must be at least 2 characters.";
    else if (!nameRx.test(name))   errs.fullName = "Only letters, spaces, and periods allowed.";
    if (phone && !/^\d{10}$/.test(phone)) errs.phone = "Enter a valid 10-digit number.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      if (membershipId) {
        await setDoc(doc(db, "organizationMembers", membershipId), {
          fullName: name, phone, updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      await setDoc(doc(db, "users", userId), {
        name, phone, updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success("Profile updated!");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={open}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold transition-colors hover:bg-emerald-100"
      >
        <Edit3 className="w-3.5 h-3.5" /> Edit Profile
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</p>
        <input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value.replace(/[^A-Za-z\s.]/g, ""))}
          placeholder="Your full name"
          className={`w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 ${errors.fullName ? "border-red-400 bg-red-50 focus:ring-red-400/30" : "border-slate-200 bg-slate-50 focus:ring-emerald-400/30"}`}
        />
        {errors.fullName && <p className="text-[11px] text-red-500">{errors.fullName}</p>}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</p>
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="10 digit mobile number"
          className={`w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 ${errors.phone ? "border-red-400 bg-red-50 focus:ring-red-400/30" : "border-slate-200 bg-slate-50 focus:ring-emerald-400/30"}`}
        />
        {errors.phone && <p className="text-[11px] text-red-500">{errors.phone}</p>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={cancel}
          className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main More/Profile Page ────────────────────────────────────────────────────
export default function AgentProfile() {
  const { user }         = useUser();
  const { organization } = useOrganization();

  const agentId = user?.id    || "";
  const membershipId = user && organization ? membershipIdFor(organization.id, user.id) : null;

  const { data: membershipDoc } = useDocumentRealtime<any>(
    "organizationMembers",
    membershipId
  );

  const shortId = agentId ? `FC-${agentId.slice(-6).toUpperCase()}` : "—";
  const displayName = membershipDoc?.fullName || user?.fullName || "Agent";
  const displayPhone = membershipDoc?.phone || "";

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* ── Profile Card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Green banner */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 h-20" />

        <div className="px-5 pb-5">
          {/* Avatar — floated up over the banner */}
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <ProfileAvatarEditor
              fallbackLetter={user?.firstName?.charAt(0) || "A"}
              accentColor="emerald"
              size="lg"
              membershipId={membershipId}
              userId={user?.id}
              className="ring-white"
            />
            {user && (
              <InlineProfileEditor
                membershipId={membershipId}
                membershipDoc={membershipDoc}
                userId={user.id}
              />
            )}
          </div>

          <div className="mb-3">
            <p className="text-xl font-black text-slate-900">{displayName}</p>
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
            {displayPhone && (
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-700">{displayPhone}</span>
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
