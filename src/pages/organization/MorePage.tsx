import React, { useState, useEffect, useRef, useMemo } from "react";
import { useUser, useOrganization, SignOutButton } from "@clerk/clerk-react";
import AppSwitch from "@/components/ui/AppSwitch";
import {
  doc, setDoc, serverTimestamp, getCountFromServer,
  collection as fsCollection, query, where,
  updateDoc, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useDocumentRealtime, useCollectionRealtime } from "@/lib/firestore-hooks";
import { membershipIdFor } from "@/lib/services";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  User, Building2, Users, CreditCard, Bell, Wallet,
  MessageCircle, Info, ClipboardList, LogOut, Phone, Mail,
  Edit2, Loader2, Lock, Shield, HelpCircle, Flag,
  FileText, Star, ExternalLink, Check,
  IndianRupee, UserPlus, UserCheck, AlertCircle, BellOff,
  CheckCheck, Trash2, TrendingDown, CheckCircle2,
  SlidersHorizontal, Settings, BarChart3, Zap, KeyRound,
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FieldError from "@/components/ui/FieldError";
import { sanitizeName } from "@/lib/validation";
import { BrandMark } from "@/components/BrandLogo";
import ProfileAvatarEditor from "@/components/ui/ProfileAvatarEditor";
import OrgLogoEditor from "@/components/ui/OrgLogoEditor";
import PhonePeSettings from "./PhonePeSettings";

type MoreSubPage =
  | "list"
  | "profile"
  | "organization"
  | "orgInfo"
  | "orgStats"
  | "paymentGateway"
  | "orgSecurity"
  | "orgAdvanced"
  | "notifications"
  | "notifSettings"
  | "support"
  | "about";

function switchTab(tab: string) {
  window.dispatchEvent(new CustomEvent("fundcircle:switchTab", { detail: tab }));
}


// ── Sub-page back header ───────────────────────────────────────────────────────
function SubPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={onBack}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors"
        aria-label="Go back"
      >
        <ChevronLeft className="w-5 h-5 text-slate-600" />
      </button>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}

// ── Info row card ──────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, badge }: {
  icon: React.ComponentType<any>; label: string; value: string; badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white border border-slate-100">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 shrink-0">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{value}</p>
      </div>
      {badge && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">{badge}</span>
      )}
    </div>
  );
}

// ── PROFILE SUB-PAGE ──────────────────────────────────────────────────────────
function ProfileSubPage({ onBack }: { onBack: () => void }) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const membershipId = user && organization ? membershipIdFor(organization.id, user.id) : null;
  const { data: membershipDoc, loading } = useDocumentRealtime<any>("organizationMembers", membershipId);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (loading || !membershipDoc || initRef.current) return;
    setFullName(membershipDoc.fullName || user?.fullName || "");
    setPhone(membershipDoc.phone || "");
    initRef.current = true;
  }, [membershipDoc, loading]);

  useEffect(() => { initRef.current = false; }, [membershipId]);

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    const name = fullName.trim();
    if (!name || name.length < 2) errs.fullName = "Name must be at least 2 characters.";
    if (phone && phone.replace(/\D/g, "").length !== 10) errs.phone = "Must be exactly 10 digits.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      const sanitized = sanitizeName(name) || name;
      const cleanPhone = phone.replace(/\D/g, "").slice(0, 10);
      await setDoc(doc(db, "organizationMembers", membershipId!), {
        fullName: sanitized, phone: cleanPhone, updatedAt: serverTimestamp(),
      }, { merge: true });
      await setDoc(doc(db, "users", user!.id), {
        name: sanitized, phone: cleanPhone, updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success("Profile updated.");
      setEditing(false);
    } catch { toast.error("Failed to update profile."); }
    finally { setSaving(false); }
  };

  const displayName = membershipDoc?.fullName || user?.fullName || "—";
  const displayPhone = membershipDoc?.phone;

  return (
    <div>
      <SubPageHeader title="My Profile" onBack={onBack} />

      {/* Profile photo editor */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <ProfileAvatarEditor
          fallbackLetter={displayName.charAt(0) || "O"}
          accentColor="sky"
          size="lg"
          membershipId={membershipId}
          userId={user?.id}
        />
        <div className="text-center">
          <p className="text-xl font-bold text-slate-900">{displayName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{user?.primaryEmailAddress?.emailAddress}</p>
          <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-bold">
            <Shield className="w-3 h-3" /> Owner
          </span>
        </div>
      </div>

      {!editing ? (
        <div className="space-y-2.5">
          <InfoRow icon={User}   label="Full Name" value={displayName} />
          <InfoRow icon={Mail}   label="Email"     value={user?.primaryEmailAddress?.emailAddress || "—"} badge="Read-only" />
          <InfoRow icon={Phone}  label="Phone"     value={displayPhone ? `+91 ${displayPhone}` : "Not set"} />
          <InfoRow icon={Shield} label="Role"      value="Owner" badge="Admin" />

          <div className="pt-4 space-y-2.5">
            <button
              onClick={() => setEditing(true)}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold text-sm transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
            <SignOutButton>
              <button className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-red-200 bg-white text-red-600 hover:bg-red-50 active:bg-red-100 font-semibold text-sm transition-colors">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </SignOutButton>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: "" })); }}
              placeholder="Your full name"
              maxLength={100}
              className={`h-12 rounded-2xl ${errors.fullName ? "border-red-400" : ""}`}
            />
            <FieldError error={errors.fullName} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Phone Number</Label>
            <Input
              type="tel" inputMode="numeric" maxLength={10}
              value={phone}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setPhone(v); setErrors(p => ({ ...p, phone: "" })); }}
              placeholder="10-digit mobile number"
              className={`h-12 rounded-2xl ${errors.phone ? "border-red-400" : ""}`}
            />
            <FieldError error={errors.phone} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-700">Email Address</Label>
            <div className="flex items-center gap-2 h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 text-sm">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              {user?.primaryEmailAddress?.emailAddress}
            </div>
          </div>
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => { setEditing(false); setErrors({}); }}
              disabled={saving}
              className="flex-1 h-12 rounded-2xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-12 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ORGANIZATION NAV HUB ──────────────────────────────────────────────────────
function OrganizationSubPage({ onBack, onNavigate }: {
  onBack: () => void;
  onNavigate: (page: MoreSubPage) => void;
}) {
  const { organization } = useOrganization();
  const orgId = organization?.id || null;
  const { data: orgDoc, loading: orgLoading } = useDocumentRealtime<any>("organizations", orgId);

  const isConfigured = orgDoc?.phonePeConfigured === true;
  const pgEnv = (orgDoc?.phonePeEnvironment || "sandbox") as "sandbox" | "production";

  const ORG_NAV = [
    {
      id: "orgInfo" as MoreSubPage,
      label: "Business Information",
      sub: "Logo, name & owner details",
      icon: Building2,
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      id: "orgStats" as MoreSubPage,
      label: "Statistics",
      sub: "Customers, collectors & collections",
      icon: BarChart3,
      iconBg: "bg-sky-100",
      iconColor: "text-sky-600",
    },
    {
      id: "paymentGateway" as MoreSubPage,
      label: "Payment Gateway",
      sub: isConfigured
        ? `PhonePe · ${pgEnv === "production" ? "Live" : "Sandbox"}`
        : "Configure PhonePe UPI payments",
      icon: Zap,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      badge: isConfigured
        ? pgEnv === "production" ? "Live" : "Sandbox"
        : "Setup",
      badgeCls: isConfigured
        ? pgEnv === "production"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-700"
        : "bg-violet-100 text-violet-600",
    },
    {
      id: "orgSecurity" as MoreSubPage,
      label: "Security",
      sub: "Password, sessions & access",
      icon: KeyRound,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      id: "orgAdvanced" as MoreSubPage,
      label: "Advanced Settings",
      sub: "Organization ID & identifiers",
      icon: SlidersHorizontal,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
    },
  ];

  return (
    <div>
      <SubPageHeader title="Organization" onBack={onBack} />

      {/* Org identity */}
      <div className="flex flex-col items-center gap-2 mb-8">
        <OrgLogoEditor size="lg" />
        {orgLoading
          ? <div className="h-5 w-32 bg-slate-100 rounded-lg animate-pulse" />
          : <p className="text-xl font-bold text-slate-900">{orgDoc?.name || organization?.name || "—"}</p>
        }
        <span className="text-xs text-slate-400">Organization</span>
      </div>

      {/* Navigation cards */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {ORG_NAV.map((item, idx) => {
          const Icon = item.icon;
          const isLast = idx === ORG_NAV.length - 1;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={[
                "w-full flex items-center gap-3.5 px-4 py-4 text-left",
                "hover:bg-slate-50 active:bg-slate-100 transition-colors",
                !isLast ? "border-b border-slate-50" : "",
              ].join(" ")}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 ${item.iconBg}`}>
                <Icon className={`w-[18px] h-[18px] ${item.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{item.sub}</p>
              </div>
              {(item as any).badge && (
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 mr-0.5 ${(item as any).badgeCls}`}>
                  {(item as any).badge}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-slate-200 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── ORG INFO SUB-PAGE ─────────────────────────────────────────────────────────
function OrgInfoSubPage({ onBack }: { onBack: () => void }) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const orgId = organization?.id || null;
  const { data: orgDoc, loading: orgLoading } = useDocumentRealtime<any>("organizations", orgId);

  const [orgName, setOrgName] = useState("");
  const [orgNameError, setOrgNameError] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    if (orgLoading || !orgDoc || initRef.current) return;
    setOrgName(orgDoc.name || organization?.name || "");
    initRef.current = true;
  }, [orgDoc, orgLoading]);

  useEffect(() => { initRef.current = false; }, [orgId]);

  const handleSaveName = async () => {
    const name = orgName.trim();
    if (!name || name.length < 3) { setOrgNameError("Minimum 3 characters."); return; }
    if (name.length > 100) { setOrgNameError("Maximum 100 characters."); return; }
    setOrgNameError("");
    setSavingName(true);
    try {
      const sanitized = sanitizeName(name) || name;
      await setDoc(doc(db, "organizations", orgId!), { name: sanitized, updatedAt: serverTimestamp() }, { merge: true });
      setOrgName(sanitized);
      setEditingName(false);
      toast.success("Organization name updated.");
    } catch { toast.error("Failed to update organization."); }
    finally { setSavingName(false); }
  };

  const createdAt: Date | null = orgDoc?.createdAt?.toDate?.() ?? null;

  return (
    <div>
      <SubPageHeader title="Business Information" onBack={onBack} />

      {/* Org logo + name */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <OrgLogoEditor size="lg" />
        {editingName ? (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <Input
              value={orgName}
              onChange={(e) => { setOrgName(e.target.value); setOrgNameError(""); }}
              className={`h-10 rounded-xl text-center font-bold ${orgNameError ? "border-red-400" : ""}`}
              maxLength={100}
              autoFocus
            />
            <button onClick={handleSaveName} disabled={savingName}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shrink-0">
              {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button onClick={() => { setEditingName(false); setOrgNameError(""); }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold text-slate-900">{orgName || organization?.name}</p>
            <button onClick={() => setEditingName(true)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200">
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        )}
        {orgNameError && <p className="text-xs text-red-500">{orgNameError}</p>}
      </div>

      {/* Owner info */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Owner</p>
        <InfoRow icon={User}     label="Full Name"     value={user?.fullName || "—"} />
        <InfoRow icon={Mail}     label="Email Address" value={user?.primaryEmailAddress?.emailAddress || "—"} badge="Read-only" />
        <InfoRow icon={Shield}   label="Role"          value="Owner" badge="Admin" />
        {createdAt && (
          <InfoRow icon={FileText} label="Member Since"
            value={createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} />
        )}
      </div>
    </div>
  );
}

// ── ORG STATS SUB-PAGE ────────────────────────────────────────────────────────
function OrgStatsSubPage({ onBack }: { onBack: () => void }) {
  const { organization } = useOrganization();
  const orgId = organization?.id || null;
  const [stats, setStats] = useState<{ customers: number; collectors: number; collections: number; loans: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const [custSnap, agentSnap, collSnap, loanSnap] = await Promise.all([
          getCountFromServer(query(fsCollection(db, "organizationMembers"), where("organizationId", "==", orgId), where("role", "==", "CUSTOMER"))),
          getCountFromServer(query(fsCollection(db, "organizationMembers"), where("organizationId", "==", orgId), where("role", "==", "AGENT"))),
          getCountFromServer(query(fsCollection(db, "collections"), where("organizationId", "==", orgId))),
          getCountFromServer(query(fsCollection(db, "loans"), where("organizationId", "==", orgId))),
        ]);
        setStats({
          customers:   custSnap.data().count,
          collectors:  agentSnap.data().count,
          collections: collSnap.data().count,
          loans:       loanSnap.data().count,
        });
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [orgId]);

  const CARDS = [
    { label: "Total Customers",   key: "customers",   from: "from-sky-400",     to: "to-sky-600",     icon: Users         },
    { label: "Collectors",        key: "collectors",  from: "from-indigo-400",  to: "to-indigo-600",  icon: UserCheck     },
    { label: "Total Collections", key: "collections", from: "from-emerald-400", to: "to-emerald-600", icon: IndianRupee   },
    { label: "Active Loans",      key: "loans",       from: "from-violet-400",  to: "to-violet-600",  icon: CreditCard    },
  ];

  return (
    <div>
      <SubPageHeader title="Statistics" onBack={onBack} />
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        Live counts for your organization's activity.
      </p>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {CARDS.map((c) => {
            const Icon = c.icon;
            const val = stats ? (stats as any)[c.key] : 0;
            return (
              <div key={c.key} className={`rounded-2xl p-4 bg-gradient-to-br ${c.from} ${c.to} shadow-sm`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4 text-white/70" />
                </div>
                <p className="text-3xl font-black text-white leading-none">{val ?? "—"}</p>
                <p className="text-[11px] font-semibold text-white/80 mt-1.5 leading-tight">{c.label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── PAYMENT GATEWAY SUB-PAGE ──────────────────────────────────────────────────
function PaymentGatewaySubPage({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <SubPageHeader title="Payment Gateway" onBack={onBack} />

      {/* Description */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold">PhonePe UPI</p>
            <p className="text-xs text-violet-200">Dynamic QR for EMI collection</p>
          </div>
        </div>
        <p className="text-xs text-violet-100 leading-relaxed">
          Each organization uses its own PhonePe Merchant Account. Payments go directly
          to your account — FundCircle never holds your funds.
        </p>
      </div>

      {/* PhonePe settings card */}
      <PhonePeSettings />
    </div>
  );
}

// ── ORG SECURITY SUB-PAGE ─────────────────────────────────────────────────────
function OrgSecuritySubPage({ onBack }: { onBack: () => void }) {
  const { user } = useUser();

  const ITEMS = [
    {
      label: "Change Password",
      desc: "Update via your email account",
      icon: KeyRound,
      bg: "bg-amber-50",
      iconColor: "text-amber-600",
      action: () => user?.primaryEmailAddress?.emailAddress
        ? window.open(`mailto:${user.primaryEmailAddress.emailAddress}?subject=Change+FundCircle+Password`)
        : undefined,
    },
    {
      label: "Active Sessions",
      desc: "Managed by Clerk authentication",
      icon: Shield,
      bg: "bg-sky-50",
      iconColor: "text-sky-600",
      action: null,
    },
    {
      label: "Two-Factor Authentication",
      desc: "Set up in Clerk dashboard",
      icon: Lock,
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      action: null,
    },
  ];

  return (
    <div>
      <SubPageHeader title="Security" onBack={onBack} />

      <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3.5 flex items-start gap-3">
        <Shield className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          Security settings like password and 2FA are managed through your Clerk account.
          Your organization data is protected with role-based access controls.
        </p>
      </div>

      <div className="space-y-2.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              onClick={item.action || undefined}
              className={[
                "flex items-center gap-3 px-4 py-4 rounded-2xl border border-slate-100 bg-white",
                item.action ? "cursor-pointer hover:bg-slate-50 active:bg-slate-100 transition-colors" : "opacity-70",
              ].join(" ")}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.bg} shrink-0`}>
                <Icon className={`w-4.5 h-4.5 ${item.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </div>
              {item.action && <ExternalLink className="w-4 h-4 text-slate-300 shrink-0" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ORG ADVANCED SUB-PAGE ─────────────────────────────────────────────────────
function OrgAdvancedSubPage({ onBack }: { onBack: () => void }) {
  const { organization } = useOrganization();
  const orgId = organization?.id || null;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!orgId) return;
    navigator.clipboard.writeText(orgId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <SubPageHeader title="Advanced Settings" onBack={onBack} />

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organization ID</p>
          <p className="font-mono text-xs text-slate-600 break-all bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 select-all">
            {orgId || "—"}
          </p>
          <button
            onClick={handleCopy}
            className={[
              "flex items-center gap-1.5 text-xs font-semibold transition-colors",
              copied ? "text-emerald-600" : "text-sky-600 hover:text-sky-700",
            ].join(" ")}
          >
            {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><ClipboardList className="w-3.5 h-3.5" />Copy ID</>}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organization Name</p>
          <p className="text-sm font-semibold text-slate-800">{organization?.name || "—"}</p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 space-y-1.5">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Danger Zone
          </p>
          <p className="text-xs text-red-700 leading-relaxed">
            Contact FundCircle support to delete or transfer ownership of this organization.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Notification helpers ───────────────────────────────────────────────────────
type NotifCategory2 = "all" | "collections" | "customers" | "collectors" | "loans" | "system";
interface NotifItem {
  id: string; title: string; message: string; read: boolean;
  timestamp: any; userId: string; organizationId: string;
  type?: string; category?: string; actorName?: string;
}
const NOTIF_FILTERS = [
  { id: "all" as NotifCategory2, label: "All" },
  { id: "collections" as NotifCategory2, label: "Collections" },
  { id: "customers" as NotifCategory2, label: "Customers" },
  { id: "collectors" as NotifCategory2, label: "Collectors" },
  { id: "loans" as NotifCategory2, label: "Loans" },
  { id: "system" as NotifCategory2, label: "System" },
];
function getNotifCategory(n: NotifItem): NotifCategory2 {
  if (n.category) return n.category as NotifCategory2;
  const t = (n.type || "").toUpperCase();
  if (t.includes("COLLECTION") || t.includes("DEPOSIT") || t === "EMI_COLLECTED") return "collections";
  if (t.includes("CUSTOMER") || t === "NEW_CUSTOMER") return "customers";
  if (t.includes("COLLECTOR") || t === "NEW_COLLECTOR") return "collectors";
  if (t.includes("LOAN") || t.includes("EMI")) return "loans";
  return "system";
}
const NOTIF_TYPE_META: Record<string, { icon: React.FC<any>; bg: string; iconColor: string; dot: string }> = {
  collections: { icon: IndianRupee, bg: "bg-emerald-50", iconColor: "text-emerald-600", dot: "bg-emerald-500" },
  customers:   { icon: UserPlus,    bg: "bg-sky-50",     iconColor: "text-sky-600",     dot: "bg-sky-500"     },
  collectors:  { icon: UserCheck,   bg: "bg-violet-50",  iconColor: "text-violet-600",  dot: "bg-violet-500"  },
  loans:       { icon: CreditCard,  bg: "bg-indigo-50",  iconColor: "text-indigo-600",  dot: "bg-indigo-500"  },
  system:      { icon: AlertCircle, bg: "bg-amber-50",   iconColor: "text-amber-600",   dot: "bg-amber-500"   },
};
const NOTIF_ICON_MAP: Record<string, React.FC<any>> = {
  NEW_CUSTOMER: UserPlus, NEW_COLLECTOR: UserCheck,
  COLLECTION_RECORDED: IndianRupee, COLLECTION_UPDATED: IndianRupee,
  DEPOSIT_COLLECTED: IndianRupee, EMI_COLLECTED: IndianRupee,
  LOAN_APPLIED: CreditCard, LOAN_APPROVED: CheckCircle2,
  LOAN_REJECTED: TrendingDown, EMI_DUE: AlertCircle,
  EMI_MISSED: AlertCircle, EMI_OVERDUE: AlertCircle,
  REPORT_EXPORTED: FileText, PROFILE_UPDATED: User,
  ORGANIZATION_UPDATED: Building2,
};
function tsToDate2(ts: any): Date {
  if (!ts) return new Date();
  if (typeof ts.toDate === "function") return ts.toDate();
  return new Date(ts);
}
function groupByDay2(items: NotifItem[]): { label: string; items: NotifItem[] }[] {
  const today: NotifItem[] = [], yesterday: NotifItem[] = [], earlier: NotifItem[] = [];
  for (const n of items) {
    const d = tsToDate2(n.timestamp);
    if (isToday(d)) today.push(n);
    else if (isYesterday(d)) yesterday.push(n);
    else earlier.push(n);
  }
  const groups = [];
  if (today.length)     groups.push({ label: "Today",     items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (earlier.length)   groups.push({ label: "Earlier",   items: earlier });
  return groups;
}

// ── NOTIFICATIONS INBOX SUB-PAGE ──────────────────────────────────────────────
function NotificationsSubPage({ onBack, onSettings }: { onBack: () => void; onSettings: () => void }) {
  const { data: rawNotifs, loading } = useCollectionRealtime<NotifItem>("notifications");
  const [filter, setFilter] = useState<NotifCategory2>("all");
  const [clearing, setClearing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const sorted = useMemo(() =>
    [...rawNotifs].sort((a, b) => tsToDate2(b.timestamp).valueOf() - tsToDate2(a.timestamp).valueOf()),
    [rawNotifs]
  );
  const filtered = useMemo(() =>
    filter === "all" ? sorted : sorted.filter(n => getNotifCategory(n) === filter),
    [sorted, filter]
  );
  const groups = useMemo(() => groupByDay2(filtered), [filtered]);
  const unreadCount = useMemo(() => sorted.filter(n => !n.read).length, [sorted]);
  const filteredUnread = useMemo(() => filtered.filter(n => !n.read).length, [filtered]);

  const markRead = async (id: string) => {
    try { await updateDoc(doc(db, "notifications", id), { read: true, updatedAt: serverTimestamp() }); }
    catch { toast.error("Could not mark as read."); }
  };

  const markAllRead = async () => {
    const unread = filtered.filter(n => !n.read);
    if (!unread.length) return;
    setMarkingAll(true);
    try {
      const batch = writeBatch(db);
      unread.forEach(n => batch.update(doc(db, "notifications", n.id), { read: true, updatedAt: serverTimestamp() }));
      await batch.commit();
      toast.success("All marked as read.");
    } catch { toast.error("Failed to update."); }
    finally { setMarkingAll(false); }
  };

  const clearAll = async () => {
    if (!filtered.length) return;
    setClearing(true);
    try {
      const batch = writeBatch(db);
      filtered.forEach(n => batch.delete(doc(db, "notifications", n.id)));
      await batch.commit();
      toast.success("Notifications cleared.");
    } catch { toast.error("Failed to clear."); }
    finally { setClearing(false); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </div>
        <button onClick={onSettings}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
          <Settings className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* Action bar */}
      {!loading && filtered.length > 0 && (
        <div className="flex gap-2 mb-4">
          {filteredUnread > 0 && (
            <button onClick={markAllRead} disabled={markingAll}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
              {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
              Mark all read
            </button>
          )}
          <button onClick={clearAll} disabled={clearing}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-red-100 bg-red-50 text-xs font-semibold text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50">
            {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Clear all
          </button>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-none">
        {NOTIF_FILTERS.map(f => {
          const cnt = f.id === "all"
            ? sorted.filter(n => !n.read).length
            : sorted.filter(n => !n.read && getNotifCategory(n) === f.id).length;
          const isActive = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={[
                "flex items-center gap-1 shrink-0 h-7 px-3 rounded-full text-xs font-semibold transition-all border",
                isActive ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
              ].join(" ")}>
              {f.label}
              {cnt > 0 && (
                <span className={["inline-flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-bold px-0.5",
                  isActive ? "bg-white/20 text-white" : "bg-red-500 text-white"].join(" ")}>{cnt}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3 p-4 rounded-2xl bg-white border border-slate-100 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                <div className="h-3 bg-slate-100 rounded-full w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <BellOff className="h-7 w-7 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-1">
            {filter === "all" ? "No notifications yet" : `No ${filter} notifications`}
          </p>
          <p className="text-xs text-slate-400 max-w-[220px]">
            {filter === "all" ? "Alerts will show up here as activity happens." : "Switch to All to see everything."}
          </p>
          {filter !== "all" && (
            <button onClick={() => setFilter("all")} className="mt-3 text-xs font-semibold text-sky-600">View all</button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{group.label}</p>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="space-y-2">
                {group.items.map(n => {
                  const cat = getNotifCategory(n);
                  const base = NOTIF_TYPE_META[cat] || NOTIF_TYPE_META.system;
                  const SpecificIcon = NOTIF_ICON_MAP[(n.type || "").toUpperCase()];
                  const Icon = SpecificIcon || base.icon;
                  const ts = tsToDate2(n.timestamp);
                  return (
                    <div key={n.id} onClick={() => !n.read && markRead(n.id)}
                      className={[
                        "relative flex items-start gap-3 rounded-2xl border p-3.5 transition-all",
                        n.read ? "bg-white border-slate-100" : `${base.bg} border-transparent shadow-sm cursor-pointer active:scale-[0.99]`,
                      ].join(" ")}>
                      {!n.read && <span className={`absolute top-3.5 right-3.5 h-2 w-2 rounded-full ${base.dot}`} />}
                      <div className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                        n.read ? "bg-slate-50 border-slate-100" : `${base.bg} border-white/60`,
                      ].join(" ")}>
                        <Icon className={`h-4 w-4 ${n.read ? "text-slate-400" : base.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className={`text-sm font-semibold leading-snug ${n.read ? "text-slate-500" : "text-slate-900"}`}>{n.title}</p>
                        <p className={`mt-0.5 text-xs leading-relaxed ${n.read ? "text-slate-400" : "text-slate-600"}`}>{n.message}</p>
                        <p className="mt-1.5 text-[10px] text-slate-400">{formatDistanceToNow(ts, { addSuffix: true })}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── NOTIFICATION SETTINGS SUB-PAGE ────────────────────────────────────────────
function NotifSettingsSubPage({ onBack }: { onBack: () => void }) {
  const { organization } = useOrganization();
  const orgId = organization?.id || null;
  const { data: orgDoc, loading } = useDocumentRealtime<any>("organizations", orgId);

  const [notifs, setNotifs] = useState({
    newCollection:    true,
    newCustomer:      true,
    newCollector:     true,
    loanApproval:     true,
    missedCollection: false,
    emiDue:           true,
    reportExported:   false,
    systemAlerts:     true,
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (loading || !orgDoc || initRef.current) return;
    setNotifs({
      newCollection:    orgDoc.settings?.notifNewCollection    ?? true,
      newCustomer:      orgDoc.settings?.notifNewMember        ?? true,
      newCollector:     orgDoc.settings?.notifNewMember        ?? true,
      loanApproval:     orgDoc.settings?.notifLoanApproval     ?? true,
      missedCollection: orgDoc.settings?.notifMissedCollection ?? false,
      emiDue:           orgDoc.settings?.notifEmiDue           ?? true,
      reportExported:   orgDoc.settings?.notifReportExported   ?? false,
      systemAlerts:     orgDoc.settings?.notifSystemAlerts     ?? true,
    });
    initRef.current = true;
  }, [orgDoc, loading]);

  useEffect(() => { initRef.current = false; }, [orgId]);

  const FS_KEY_MAP: Record<string, string> = {
    newCollection:    "notifNewCollection",
    newCustomer:      "notifNewMember",
    newCollector:     "notifNewMember",
    loanApproval:     "notifLoanApproval",
    missedCollection: "notifMissedCollection",
    emiDue:           "notifEmiDue",
    reportExported:   "notifReportExported",
    systemAlerts:     "notifSystemAlerts",
  };

  const handleToggle = async (key: keyof typeof notifs, value: boolean) => {
    setNotifs(prev => ({ ...prev, [key]: value }));
    setSavingKey(key);
    try {
      await setDoc(doc(db, "organizations", orgId!), {
        settings: { [FS_KEY_MAP[key as string]]: value },
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch {
      setNotifs(prev => ({ ...prev, [key]: !value }));
      toast.error("Failed to save preference.");
    } finally { setSavingKey(null); }
  };

  const SECTIONS = [
    {
      label: "Collections",
      icon: IndianRupee,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      items: [
        { key: "newCollection"    as const, label: "New Collection",    desc: "When any agent records a collection"  },
        { key: "missedCollection" as const, label: "Collection Missed", desc: "When an EMI installment is past due"  },
      ],
    },
    {
      label: "Members",
      icon: Users,
      color: "text-sky-600",
      bg: "bg-sky-50",
      items: [
        { key: "newCustomer"  as const, label: "New Customer",   desc: "When a customer joins"              },
        { key: "newCollector" as const, label: "New Collector",  desc: "When a new collector is added"      },
      ],
    },
    {
      label: "Loans & EMI",
      icon: CreditCard,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      items: [
        { key: "loanApproval" as const, label: "Loan Approved/Rejected", desc: "Loan application status changes" },
        { key: "emiDue"       as const, label: "EMI Due Reminders",      desc: "When an EMI payment is due"      },
      ],
    },
    {
      label: "System",
      icon: AlertCircle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      items: [
        { key: "reportExported" as const, label: "Report Exported", desc: "When a report is generated"        },
        { key: "systemAlerts"   as const, label: "System Alerts",   desc: "Platform updates & notices"         },
      ],
    },
  ];

  return (
    <div>
      <SubPageHeader title="Notification Settings" onBack={onBack} />
      <p className="text-sm text-slate-500 mb-5 leading-relaxed">
        Choose which events send you alerts. Changes save instantly.
      </p>
      <div className="space-y-4">
        {SECTIONS.map(section => {
          const SectionIcon = section.icon;
          return (
            <div key={section.label}>
              <div className="flex items-center gap-2 mb-2.5 px-1">
                <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${section.bg} shrink-0`}>
                  <SectionIcon className={`w-3.5 h-3.5 ${section.color}`} />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{section.label}</p>
              </div>
              <div className="space-y-2">
                {loading
                  ? section.items.map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)
                  : section.items.map(item => (
                    <div key={item.key}
                      className={[
                        "flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl border transition-all",
                        notifs[item.key] ? "bg-sky-50/60 border-sky-100" : "bg-white border-slate-100",
                      ].join(" ")}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                      </div>
                      {savingKey === item.key
                        ? <Loader2 className="w-5 h-5 text-slate-400 animate-spin shrink-0" />
                        : <AppSwitch value={notifs[item.key]} onChange={(v) => handleToggle(item.key, v)} />
                      }
                    </div>
                  ))
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SUPPORT SUB-PAGE ───────────────────────────────────────────────────────────
function SupportSubPage({ onBack }: { onBack: () => void }) {
  const ITEMS = [
    { label: "Contact Support", desc: "Reach our support team",     icon: MessageCircle, href: "mailto:support@fundcircle.app" },
    { label: "Help Center",     desc: "Guides & tutorials",          icon: HelpCircle,    href: "https://fundcircle.app/help"  },
    { label: "FAQs",            desc: "Frequently asked questions",  icon: FileText,      href: "https://fundcircle.app/faq"   },
    { label: "Report an Issue", desc: "Tell us what went wrong",    icon: Flag,          href: "mailto:bugs@fundcircle.app"   },
  ];
  return (
    <div>
      <SubPageHeader title="Support" onBack={onBack} />
      <div className="space-y-2.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white border border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 shrink-0">
                <Icon className="w-5 h-5 text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-300 shrink-0" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── ABOUT SUB-PAGE ─────────────────────────────────────────────────────────────
function AboutSubPage({ onBack }: { onBack: () => void }) {
  const LINKS = [
    { label: "Privacy Policy",     icon: Lock,     href: "https://fundcircle.app/privacy" },
    { label: "Terms & Conditions", icon: FileText,  href: "https://fundcircle.app/terms"   },
    { label: "Rate FundCircle",    icon: Star,      href: "#"                              },
  ];
  return (
    <div>
      <SubPageHeader title="About" onBack={onBack} />
      <div className="flex flex-col items-center gap-3 mb-10">
        <BrandMark size="lg" />
        <div className="text-center">
          <p className="text-2xl font-black text-slate-900 tracking-tight">FundCircle</p>
          <p className="text-sm text-slate-500 mt-1">Modern Pigmy Collection Platform</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold">Version 1.0.0</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-semibold">Build 2025.1</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-white border border-slate-100 hover:bg-slate-50 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 shrink-0">
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <p className="flex-1 text-sm font-semibold text-slate-800">{item.label}</p>
              <ExternalLink className="w-4 h-4 text-slate-300 shrink-0" />
            </a>
          );
        })}
      </div>
      <p className="text-center text-xs text-slate-400 mt-10">
        © {new Date().getFullYear()} FundCircle. All rights reserved.
      </p>
    </div>
  );
}

// ── MAIN MORE PAGE ─────────────────────────────────────────────────────────────
const MORE_ITEMS = [
  { id: "profile",       label: "My Profile",       sub: "Photo, name, phone & role",      icon: User,          color: "sky",     internal: true,  route: null },
  { id: "organization",  label: "Organization",      sub: "Business details & statistics",  icon: Building2,     color: "indigo",  internal: true,  route: null },
  { id: "agents",        label: "Collectors",        sub: "Manage your field team",          icon: Users,         color: "violet",  internal: false, route: null },
  { id: "customers",     label: "Customers",         sub: "Customer accounts & records",    icon: Users,         color: "sky",     internal: false, route: null },
  { id: "loans",         label: "Loans & EMI",       sub: "Loan book & installments",       icon: CreditCard,    color: "emerald", internal: false, route: null },
  { id: "auditLogs",     label: "Audit Logs",        sub: "Full activity history",           icon: ClipboardList, color: "amber",   internal: false, route: null },
  { id: "notifications", label: "Notifications",     sub: "Inbox & alert preferences",       icon: Bell,          color: "orange",  internal: true,  route: null },
  { id: "billing",       label: "Billing",           sub: "Plan, usage & invoices",          icon: Wallet,        color: "rose",    internal: false, route: null },
  { id: "support",       label: "Support",           sub: "Get help & contact us",           icon: MessageCircle, color: "teal",    internal: true,  route: null },
  { id: "about",         label: "About FundCircle",  sub: "Version, privacy & terms",        icon: Info,          color: "slate",   internal: true,  route: null },
  { id: "settings",      label: "Settings",          sub: "Account, security & preferences", icon: Settings,      color: "violet",  internal: false, route: null },
] as const;

const COLOR_CLS: Record<string, string> = {
  sky:     "bg-sky-100 text-sky-600",
  indigo:  "bg-indigo-100 text-indigo-600",
  violet:  "bg-violet-100 text-violet-600",
  emerald: "bg-emerald-100 text-emerald-600",
  amber:   "bg-amber-100 text-amber-600",
  orange:  "bg-orange-100 text-orange-600",
  rose:    "bg-rose-100 text-rose-600",
  teal:    "bg-teal-100 text-teal-600",
  slate:   "bg-slate-100 text-slate-600",
};

export default function MorePage() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const membershipId = user && organization ? membershipIdFor(organization.id, user.id) : null;
  const { data: membershipDoc } = useDocumentRealtime<any>("organizationMembers", membershipId);

  const [page, setPage] = useState<MoreSubPage>(() => {
    try {
      const saved = sessionStorage.getItem("fc_more_subpage");
      if (saved) { sessionStorage.removeItem("fc_more_subpage"); return saved as MoreSubPage; }
    } catch {}
    return "list";
  });

  // Allow other parts of the app to navigate into a sub-page
  useEffect(() => {
    const handler = (e: Event) => {
      const sub = (e as CustomEvent).detail as MoreSubPage;
      setPage(sub);
    };
    window.addEventListener("fundcircle:morePage", handler);
    return () => window.removeEventListener("fundcircle:morePage", handler);
  }, []);

  if (page !== "list") {
    return (
      <div className="max-w-lg mx-auto px-1">
        {/* Top-level sub-pages */}
        {page === "profile"       && <ProfileSubPage       onBack={() => setPage("list")} />}
        {page === "notifications" && <NotificationsSubPage onBack={() => setPage("list")} onSettings={() => setPage("notifSettings")} />}
        {page === "notifSettings" && <NotifSettingsSubPage onBack={() => setPage("notifications")} />}
        {page === "support"       && <SupportSubPage       onBack={() => setPage("list")} />}
        {page === "about"         && <AboutSubPage         onBack={() => setPage("list")} />}

        {/* Organization nav hub */}
        {page === "organization" && (
          <OrganizationSubPage onBack={() => setPage("list")} onNavigate={setPage} />
        )}

        {/* Organization sub-pages */}
        {page === "orgInfo"        && <OrgInfoSubPage        onBack={() => setPage("organization")} />}
        {page === "orgStats"       && <OrgStatsSubPage       onBack={() => setPage("organization")} />}
        {page === "paymentGateway" && <PaymentGatewaySubPage onBack={() => setPage("organization")} />}
        {page === "orgSecurity"    && <OrgSecuritySubPage    onBack={() => setPage("organization")} />}
        {page === "orgAdvanced"    && <OrgAdvancedSubPage    onBack={() => setPage("organization")} />}
      </div>
    );
  }

  const displayName = membershipDoc?.fullName || user?.fullName || "Owner";
  const email = user?.primaryEmailAddress?.emailAddress || "";
  const orgName = organization?.name || "My Organization";

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-6">
      {/* Profile hero card */}
      <button
        onClick={() => setPage("profile")}
        className="w-full flex items-center gap-4 px-5 py-4 rounded-3xl bg-gradient-to-r from-sky-500 to-indigo-600 shadow-lg shadow-indigo-100 text-left active:opacity-90 transition-opacity"
      >
        <Avatar className="h-14 w-14 ring-2 ring-white/40 shrink-0">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-white truncate">{displayName}</p>
          <p className="text-xs text-sky-100 truncate mt-0.5">{email}</p>
          <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold tracking-wide">
            Owner · {orgName}
          </span>
        </div>
        <ChevronRight className="w-5 h-5 text-white/50 shrink-0" />
      </button>

      {/* Navigation list */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {MORE_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const colorCls = COLOR_CLS[item.color] ?? "bg-slate-100 text-slate-500";
          const isLast = idx === MORE_ITEMS.length - 1;
          return (
            <button
              key={item.id + idx}
              onClick={() => {
                if (item.internal) {
                  setPage(item.id as MoreSubPage);
                } else {
                  switchTab(item.id);
                }
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-4 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors ${!isLast ? "border-b border-slate-50" : ""}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 ${colorCls}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{item.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-200 shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Sign out */}
      <SignOutButton>
        <button className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 font-semibold text-sm transition-colors">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </SignOutButton>
    </div>
  );
}
