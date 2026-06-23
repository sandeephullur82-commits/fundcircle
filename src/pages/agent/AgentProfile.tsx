import React, { useState, useEffect, useRef, useCallback } from "react";
import { useUser, useOrganization, useClerk, useSession, SignOutButton } from "@clerk/clerk-react";
import { useDocumentRealtime } from "@/lib/firestore-hooks";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SecuritySection from "@/components/ui/SecuritySection";
import {
  LogOut, Mail, Phone, BadgeCheck, Building2,
  Wifi, WifiOff, Edit3, Save, X, Camera, Trash2,
  Loader2, AlertTriangle, Shield, CalendarDays,
} from "lucide-react";
import { membershipIdFor } from "@/lib/services";
import { toast } from "sonner";

// ─── helpers ──────────────────────────────────────────────────────────────────
const nameRx = /^[A-Za-z\s.]+$/;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

async function compressImage(file: File, maxDim = 512, maxBytes = 300 * 1024): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else        { w = Math.round((w * maxDim) / h); h = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        if (blob.size <= maxBytes) {
          resolve(new File([blob], "profile.webp", { type: "image/webp" }));
        } else {
          canvas.toBlob(
            (b2) => resolve(b2 ? new File([b2], "profile.jpg", { type: "image/jpeg" }) : file),
            "image/jpeg", 0.78,
          );
        }
      }, "image/webp", 0.85);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

function fmtMemberSince(d: any): string {
  if (!d) return "—";
  try {
    const date = d?.toDate ? d.toDate() : new Date(d);
    return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(date);
  } catch { return "—"; }
}

// ─── Compact Sync Status ──────────────────────────────────────────────────────
function SyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(isOnline ? new Date() : null);
  const [secsAgo, setSecsAgo]   = useState(0);

  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  setLastSync(new Date()); };
    const onOffline = () => { setIsOnline(false); };
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!lastSync) return;
    const iv = setInterval(() => {
      setSecsAgo(Math.round((Date.now() - lastSync.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(iv);
  }, [lastSync]);

  const syncLabel = isOnline
    ? secsAgo < 5 ? "just now" : `${secsAgo}s ago`
    : "Offline";

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
      isOnline ? "bg-emerald-50/80 border-emerald-100" : "bg-amber-50/80 border-amber-100"
    }`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-500" : "bg-amber-500"}`} />
      {isOnline
        ? <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        : <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${isOnline ? "text-emerald-800" : "text-amber-800"}`}>
          {isOnline ? "Online · Synced with Firestore" : "Offline · Collections saved locally"}
        </p>
      </div>
      <span className={`text-[10px] font-medium shrink-0 ${isOnline ? "text-emerald-600" : "text-amber-600"}`}>
        {syncLabel}
      </span>
    </div>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────
interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  membershipId: string | null;
  membershipDoc: any;
  userId: string;
  email: string;
  orgName: string;
  onSaved: (name: string, phone: string) => void;
}

function EditProfileModal({
  open, onClose, membershipId, membershipDoc, userId, email, orgName, onSaved,
}: EditProfileModalProps) {
  const { user } = useUser();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setFullName(membershipDoc?.fullName || user?.fullName || "");
      setPhone(membershipDoc?.phone || "");
      setErrors({});
    }
  }, [open]);

  const save = async () => {
    const errs: Record<string, string> = {};
    const name = fullName.trim();
    if (!name || name.length < 3)  errs.fullName = "Name must be at least 3 characters.";
    else if (name.length > 50)     errs.fullName = "Name must not exceed 50 characters.";
    else if (!nameRx.test(name))   errs.fullName = "Only letters, spaces, and periods allowed.";
    if (phone && !/^\d{10}$/.test(phone)) errs.phone = "Enter a valid 10-digit number.";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    // Optimistic update immediately
    onSaved(name, phone);
    onClose();
    try {
      const parts = name.split(" ");
      const firstName = parts[0] || "";
      const lastName  = parts.slice(1).join(" ") || "";
      // Sync Clerk
      if (user) {
        try { await user.update({ firstName, lastName }); } catch (_) {}
      }
      // Sync Firestore
      const updates = { fullName: name, name, firstName, lastName, phone, updatedAt: serverTimestamp() };
      if (membershipId) {
        await setDoc(doc(db, "organizationMembers", membershipId), updates, { merge: true });
      }
      await setDoc(doc(db, "users", userId), { name, firstName, lastName, phone, updatedAt: serverTimestamp() }, { merge: true });
      toast.success("Profile updated!");
    } catch {
      toast.error("Profile update failed. Your changes may not have saved.");
    } finally {
      setSaving(false);
    }
  };

  const inp = (err?: string) =>
    `w-full h-11 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-colors ${
      err ? "border-red-400 bg-red-50 focus:ring-red-400/30"
          : "border-slate-200 bg-slate-50 focus:ring-emerald-400/30 focus:border-emerald-400"
    }`;

  const readOnly =
    "w-full h-11 px-3 rounded-xl border border-slate-100 bg-slate-50/60 text-sm text-slate-400 cursor-default select-none";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-emerald-600" /> Edit Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={e => { setFullName(e.target.value.replace(/[^A-Za-z\s.]/g, "")); setErrors(ev => ({...ev, fullName: ""})); }}
              placeholder="Your full name"
              className={inp(errors.fullName)}
              autoFocus
              maxLength={50}
            />
            {errors.fullName && <p className="text-[11px] text-red-500">{errors.fullName}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setErrors(ev => ({...ev, phone: ""})); }}
              placeholder="10-digit mobile number"
              className={inp(errors.phone)}
            />
            {errors.phone && <p className="text-[11px] text-red-500">{errors.phone}</p>}
          </div>

          {/* Read-only fields */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email (read only)</label>
            <div className={readOnly + " flex items-center"}>
              <span className="truncate">{email || "—"}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role</label>
              <div className={readOnly + " flex items-center"}>Collector</div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Organization</label>
              <div className={readOnly + " flex items-center truncate"}>{orgName || "—"}</div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                : <><Save className="w-4 h-4" />Save</>}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Logout ───────────────────────────────────────────────────────────────────
function LogoutSection() {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="w-full h-11 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
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
          Any unsynced offline data will be lost. Are you sure?
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

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function AgentProfile() {
  const { user }         = useUser();
  const { organization } = useOrganization();

  const agentId      = user?.id    || "";
  const membershipId = user && organization ? membershipIdFor(organization.id, user.id) : null;

  const { data: membershipDoc } = useDocumentRealtime<any>("organizationMembers", membershipId);

  // Optimistic local state for name/phone
  const [optimisticName,  setOptimisticName]  = useState<string | null>(null);
  const [optimisticPhone, setOptimisticPhone] = useState<string | null>(null);

  const displayName  = optimisticName  ?? membershipDoc?.fullName ?? user?.fullName ?? "Agent";
  const displayPhone = optimisticPhone ?? membershipDoc?.phone    ?? "";
  const displayEmail = user?.primaryEmailAddress?.emailAddress    ?? "";
  const orgName      = organization?.name ?? membershipDoc?.organizationName ?? "";
  const memberSince  = membershipDoc?.createdAt ?? null;
  const employeeCode = membershipDoc?.employeeCode ?? "";
  const fallback     = displayName.charAt(0).toUpperCase() || "A";

  // Reset optimistic state when Firestore doc updates
  useEffect(() => {
    if (membershipDoc?.fullName) setOptimisticName(null);
    if (membershipDoc?.phone !== undefined) setOptimisticPhone(null);
  }, [membershipDoc?.fullName, membershipDoc?.phone]);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);

  // Avatar upload/remove
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing,  setRemoving]  = useState(false);
  const isAvatarLoading = uploading || removing;

  const syncAvatarFirestore = useCallback(async (imageUrl: string | null) => {
    if (!agentId) return;
    try {
      const updates = { imageUrl: imageUrl ?? "", updatedAt: serverTimestamp() };
      if (membershipId) await setDoc(doc(db, "organizationMembers", membershipId), updates, { merge: true });
      await setDoc(doc(db, "users", agentId), updates, { merge: true });
    } catch (e) {
      console.warn("[AgentProfile] Firestore avatar sync failed:", e);
    }
  }, [agentId, membershipId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !user) return;
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error("Only JPG, PNG, or WebP images are allowed."); return; }
    if (file.size > MAX_BYTES)              { toast.error("Image must be smaller than 5 MB."); return; }

    setUploading(true);
    const t = toast.loading("Uploading photo…");
    try {
      const compressed = await compressImage(file);
      await user.setProfileImage({ file: compressed });
      await user.reload();
      await syncAvatarFirestore(user.imageUrl);
      toast.success("Profile photo updated!", { id: t });
    } catch (err: any) {
      toast.error(
        err?.errors?.[0]?.longMessage || err?.message || "Unable to upload profile photo. Please try again.",
        { id: t },
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user?.imageUrl) return;
    setRemoving(true);
    const t = toast.loading("Removing photo…");
    try {
      await user.setProfileImage({ file: null as any });
      await user.reload();
      await syncAvatarFirestore(null);
      toast.success("Profile photo removed.", { id: t });
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.longMessage || err?.message || "Remove failed.", { id: t });
    } finally {
      setRemoving(false);
    }
  };

  const handleSaved = (name: string, phone: string) => {
    setOptimisticName(name);
    setOptimisticPhone(phone);
  };

  // Org logo fallback initials
  const orgInitials = orgName.slice(0, 2).toUpperCase() || "FC";

  if (!user) {
    return (
      <div className="space-y-4 max-w-xl mx-auto animate-pulse">
        <div className="bg-white rounded-2xl border border-slate-100 h-64" />
        <div className="bg-white rounded-2xl border border-slate-100 h-16" />
        <div className="bg-white rounded-2xl border border-slate-100 h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-xl mx-auto">

      {/* ── Profile Card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Compact header banner — 48px (was 80px, ~40% smaller) */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 h-12" />

        <div className="px-5 pb-5">
          {/* Avatar — centered, overlapping banner */}
          <div className="flex flex-col items-center -mt-9">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Avatar circle */}
            <div
              className="w-[72px] h-[72px] rounded-full ring-4 ring-white bg-slate-100 relative cursor-pointer group overflow-hidden shrink-0"
              onClick={() => !isAvatarLoading && fileInputRef.current?.click()}
              title="Click to change photo"
            >
              {isAvatarLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors z-10">
                  <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </div>
              )}
              {user.imageUrl ? (
                <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-white font-black text-2xl select-none">
                  {fallback}
                </div>
              )}
            </div>

            {/* Name + badge */}
            <div className="mt-2.5 text-center">
              <p className="text-lg font-black text-slate-900 leading-tight">{displayName}</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-600">Verified Collector</span>
              </div>
            </div>

            {/* Avatar controls */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Profile Photo</span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAvatarLoading}
                className="h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Change"}
              </button>
              {user.imageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isAvatarLoading}
                  className="h-7 px-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-500 text-[11px] font-semibold transition-colors disabled:opacity-50"
                >
                  {removing ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Remove"}
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mt-4 mb-3 border-t border-slate-100" />

          {/* Info rows */}
          <div className="space-y-2.5">
            {displayEmail && (
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-700 truncate">{displayEmail}</span>
              </div>
            )}
            {displayPhone ? (
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-700">{displayPhone}</span>
              </div>
            ) : null}
            {employeeCode && (
              <div className="flex items-center gap-2.5">
                <BadgeCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-500 font-mono">{employeeCode} · Agent</span>
              </div>
            )}
          </div>

          {/* Edit Profile button */}
          <button
            onClick={() => setEditOpen(true)}
            className="mt-4 w-full h-10 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>
      </div>

      {/* ── Organization Card ─────────────────────────────────────────────────── */}
      {(orgName || memberSince) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5">
          <div className="flex items-center gap-3">
            {/* Org logo / initials */}
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 overflow-hidden">
              {organization?.imageUrl
                ? <img src={organization.imageUrl} alt={orgName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : orgInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{orgName || "—"}</p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Agent
                </span>
                {memberSince && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Since {fmtMemberSince(memberSince)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sync Status ───────────────────────────────────────────────────────── */}
      <SyncStatus />

      {/* ── Security ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 px-1 mb-2">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Security</p>
        </div>
        <SecuritySection title={false} />
      </div>

      {/* ── Sign Out ──────────────────────────────────────────────────────────── */}
      <LogoutSection />

      {/* Bottom spacer for mobile nav */}
      <div className="h-4" />

      {/* ── Edit Profile Modal ────────────────────────────────────────────────── */}
      <EditProfileModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        membershipId={membershipId}
        membershipDoc={membershipDoc}
        userId={agentId}
        email={displayEmail}
        orgName={orgName}
        onSaved={handleSaved}
      />
    </div>
  );
}
