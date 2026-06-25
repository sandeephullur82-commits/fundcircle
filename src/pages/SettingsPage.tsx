import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, useOrganization, useOrganizationList, useClerk } from "@clerk/clerk-react";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Lock,
  KeyRound,
  Smartphone,
  Building2,
  QrCode,
  Bell,
  Palette,
  ShieldCheck,
  AppWindow,
  Info,
  LogOut,
  Settings,
} from "lucide-react";

interface SettingItem {
  id: string;
  label: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  action: "navigate" | "push";
  target?: string;
  ownerOnly?: boolean;
}

interface SettingGroup {
  heading: string;
  items: SettingItem[];
}

const COLOR_CLS: Record<string, string> = {
  sky:     "bg-sky-100 text-sky-600",
  indigo:  "bg-indigo-100 text-indigo-600",
  violet:  "bg-violet-100 text-violet-600",
  emerald: "bg-emerald-100 text-emerald-600",
  orange:  "bg-orange-100 text-orange-600",
  rose:    "bg-rose-100 text-rose-600",
  amber:   "bg-amber-100 text-amber-600",
  teal:    "bg-teal-100 text-teal-600",
  slate:   "bg-slate-100 text-slate-600",
  red:     "bg-red-100 text-red-600",
};

const SETTING_GROUPS: SettingGroup[] = [
  {
    heading: "Account",
    items: [
      {
        id: "account",
        label: "Account Settings",
        sub: "Name, photo & contact info",
        icon: User,
        color: "sky",
        action: "push",
        target: "account",
      },
      {
        id: "security",
        label: "Security",
        sub: "Password & login options",
        icon: ShieldCheck,
        color: "indigo",
        action: "push",
        target: "security",
      },
      {
        id: "change-password",
        label: "Change Password",
        sub: "Update your account password",
        icon: KeyRound,
        color: "violet",
        action: "navigate",
        target: "/auth/change-password",
      },
      {
        id: "sessions",
        label: "Active Sessions",
        sub: "Devices signed in to your account",
        icon: Smartphone,
        color: "emerald",
        action: "push",
        target: "sessions",
      },
    ],
  },
  {
    heading: "Organization",
    items: [
      {
        id: "org-settings",
        label: "Organization Settings",
        sub: "Business info, logo & details",
        icon: Building2,
        color: "indigo",
        action: "push",
        target: "org-settings",
        ownerOnly: true,
      },
      {
        id: "upi",
        label: "UPI & Payments",
        sub: "UPI ID, QR code & payment setup",
        icon: QrCode,
        color: "teal",
        action: "push",
        target: "upi",
        ownerOnly: true,
      },
    ],
  },
  {
    heading: "Preferences",
    items: [
      {
        id: "notifications",
        label: "Notification Preferences",
        sub: "Alerts, sounds & notification types",
        icon: Bell,
        color: "orange",
        action: "push",
        target: "notifications",
      },
      {
        id: "appearance",
        label: "Appearance",
        sub: "Theme, display & language",
        icon: Palette,
        color: "violet",
        action: "push",
        target: "appearance",
      },
      {
        id: "privacy",
        label: "Privacy",
        sub: "Data & privacy controls",
        icon: Lock,
        color: "slate",
        action: "navigate",
        target: "/privacy-policy",
      },
      {
        id: "app-prefs",
        label: "App Preferences",
        sub: "Defaults, shortcuts & display options",
        icon: AppWindow,
        color: "amber",
        action: "push",
        target: "app-prefs",
      },
    ],
  },
  {
    heading: "About",
    items: [
      {
        id: "about",
        label: "About FundCircle",
        sub: "Version, licenses & legal",
        icon: Info,
        color: "slate",
        action: "push",
        target: "about",
      },
    ],
  },
];

type SubPage =
  | "account"
  | "security"
  | "sessions"
  | "org-settings"
  | "upi"
  | "notifications"
  | "appearance"
  | "app-prefs"
  | "about";

function SubPageHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-white sticky top-0 z-10">
      <button
        onClick={onBack}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
      >
        <ChevronLeft className="w-5 h-5 text-slate-600" />
      </button>
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
    </div>
  );
}

function PlaceholderSubPage({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title={title} onBack={onBack} />
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <Settings className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="text-xs text-slate-400 max-w-xs">{description}</p>
      </div>
    </div>
  );
}

function AccountSubPage({ onBack }: { onBack: () => void }) {
  const { user } = useUser();
  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="Account Settings" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-50">
            <img
              src={user?.imageUrl}
              alt="avatar"
              className="w-14 h-14 rounded-full object-cover ring-2 ring-sky-100"
            />
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">
                {user?.fullName || "—"}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user?.primaryEmailAddress?.emailAddress || "—"}
              </p>
            </div>
          </div>
          <InfoRow label="Full Name" value={user?.fullName || "—"} />
          <InfoRow
            label="Email"
            value={user?.primaryEmailAddress?.emailAddress || "—"}
            last
          />
        </div>
        <p className="text-[11px] text-slate-400 text-center px-4">
          To edit your name or photo, tap your profile card in the More tab.
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${!last ? "border-b border-slate-50" : ""}`}
    >
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-700 truncate max-w-[55%] text-right">
        {value}
      </span>
    </div>
  );
}

function SecuritySubPage({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="Security" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <button
            onClick={() => navigate("/auth/change-password")}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                <KeyRound className="w-4 h-4 text-violet-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-800">
                  Change Password
                </p>
                <p className="text-xs text-slate-400">Update your password</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={() => onBack()}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-800">
                  Active Sessions
                </p>
                <p className="text-xs text-slate-400">
                  Devices signed in to your account
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionsSubPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="Active Sessions" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
          <Smartphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600 font-medium mb-1">
            This Device
          </p>
          <p className="text-xs text-slate-400">
            You are currently signed in on this device.
          </p>
        </div>
        <p className="text-[11px] text-slate-400 text-center px-4">
          To manage sessions across all devices, sign out and sign back in.
        </p>
      </div>
    </div>
  );
}

function OrgSettingsSubPage({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="Organization Settings" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <button
            onClick={() => {
              sessionStorage.setItem("fc_org_active_tab", "settings");
              navigate("/dashboard/owner");
            }}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100">
                <Building2 className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-800">
                  Open Organization Settings
                </p>
                <p className="text-xs text-slate-400">
                  Edit business info, logo, and details
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 text-center px-4">
          Organization settings are managed from the Owner Dashboard.
        </p>
      </div>
    </div>
  );
}

function UpiSubPage({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="UPI & Payments" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <button
            onClick={() => {
              sessionStorage.setItem("fc_org_active_tab", "settings");
              sessionStorage.setItem("fc_settings_section", "payments");
              navigate("/dashboard/owner");
            }}
            className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100">
                <QrCode className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-800">
                  Configure UPI & Payments
                </p>
                <p className="text-xs text-slate-400">
                  UPI ID, merchant name & payment defaults
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 text-center px-4">
          UPI settings are configured from the Owner Dashboard.
        </p>
      </div>
    </div>
  );
}

function NotificationsSubPage({ onBack }: { onBack: () => void }) {
  return (
    <PlaceholderSubPage
      title="Notification Preferences"
      description="Manage your notification settings from the Notifications section in the More tab."
      onBack={onBack}
    />
  );
}

function AppearanceSubPage({ onBack }: { onBack: () => void }) {
  return (
    <PlaceholderSubPage
      title="Appearance"
      description="Theme and appearance customization options coming soon."
      onBack={onBack}
    />
  );
}

function AppPrefsSubPage({ onBack }: { onBack: () => void }) {
  return (
    <PlaceholderSubPage
      title="App Preferences"
      description="Default currency, date format, and other display options coming soon."
      onBack={onBack}
    />
  );
}

function AboutSubPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <SubPageHeader title="About FundCircle" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex flex-col items-center py-6 gap-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <p className="text-base font-bold text-slate-800 mt-1">FundCircle</p>
          <p className="text-xs text-slate-400">Version 1.0.0</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden text-sm">
          <InfoRow label="App Version" value="1.0.0" />
          <InfoRow label="Platform" value="Web / PWA" />
          <InfoRow label="Environment" value="Production" last />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <a
            href="/privacy-policy"
            className="flex items-center justify-between px-4 py-3 border-b border-slate-50 hover:bg-slate-50"
          >
            <span className="text-sm text-slate-700">Privacy Policy</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </a>
          <a
            href="/terms-and-conditions"
            className="flex items-center justify-between px-4 py-3 border-b border-slate-50 hover:bg-slate-50"
          >
            <span className="text-sm text-slate-700">Terms & Conditions</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </a>
          <a
            href="/data-usage-policy"
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
          >
            <span className="text-sm text-slate-700">Data Usage Policy</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </a>
        </div>
        <p className="text-[11px] text-slate-400 text-center">
          © 2026 FundCircle. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { userMemberships } = useOrganizationList({ userMemberships: true });
  const { signOut } = useClerk();
  const [subPage, setSubPage] = useState<SubPage | null>(null);

  const activeOrgId = organization?.id;
  const activeMembership = userMemberships?.data?.find(
    (m) => m.organization?.id === activeOrgId
  );
  const isOwner = activeMembership?.role === "org:admin";

  const handleBack = () => {
    if (subPage) {
      setSubPage(null);
    } else {
      navigate(-1);
    }
  };

  const handleItem = (item: SettingItem) => {
    if (item.action === "navigate" && item.target) {
      navigate(item.target);
    } else if (item.action === "push" && item.target) {
      setSubPage(item.target as SubPage);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth/sign-in");
  };

  if (subPage === "account")
    return <div className="min-h-screen bg-slate-50"><AccountSubPage onBack={() => setSubPage(null)} /></div>;
  if (subPage === "security")
    return <div className="min-h-screen bg-slate-50"><SecuritySubPage onBack={() => setSubPage(null)} /></div>;
  if (subPage === "sessions")
    return <div className="min-h-screen bg-slate-50"><SessionsSubPage onBack={() => setSubPage(null)} /></div>;
  if (subPage === "org-settings")
    return <div className="min-h-screen bg-slate-50"><OrgSettingsSubPage onBack={() => setSubPage(null)} /></div>;
  if (subPage === "upi")
    return <div className="min-h-screen bg-slate-50"><UpiSubPage onBack={() => setSubPage(null)} /></div>;
  if (subPage === "notifications")
    return <div className="min-h-screen bg-slate-50"><NotificationsSubPage onBack={() => setSubPage(null)} /></div>;
  if (subPage === "appearance")
    return <div className="min-h-screen bg-slate-50"><AppearanceSubPage onBack={() => setSubPage(null)} /></div>;
  if (subPage === "app-prefs")
    return <div className="min-h-screen bg-slate-50"><AppPrefsSubPage onBack={() => setSubPage(null)} /></div>;
  if (subPage === "about")
    return <div className="min-h-screen bg-slate-50"><AboutSubPage onBack={() => setSubPage(null)} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10 safe-area-pt">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">Settings</h1>
        <span className="ml-auto text-[9px] font-bold tracking-widest text-slate-300 uppercase select-none">
          SETTINGS PAGE LOADED
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-5 space-y-5 pb-10">
        {SETTING_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.ownerOnly || isOwner
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.heading}>
              <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mb-2 px-1">
                {group.heading}
              </p>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                {visibleItems.map((item, idx) => {
                  const Icon = item.icon;
                  const colorCls = COLOR_CLS[item.color] ?? COLOR_CLS.slate;
                  const isLast = idx === visibleItems.length - 1;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItem(item)}
                      className={`w-full flex items-center gap-3.5 px-4 py-4 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors ${!isLast ? "border-b border-slate-50" : ""}`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 ${colorCls}`}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 leading-tight">
                          {item.label}
                        </p>
                        <p className="text-xs text-slate-400 leading-tight mt-0.5 truncate">
                          {item.sub}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Sign Out */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3.5 px-4 py-4 text-left hover:bg-red-50 active:bg-red-100 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 shrink-0">
                <LogOut className="w-4.5 h-4.5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-600 leading-tight">
                  Sign Out
                </p>
                <p className="text-xs text-slate-400 leading-tight mt-0.5">
                  Sign out of your account
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* User info footer */}
        {user && (
          <p className="text-[11px] text-slate-400 text-center">
            Signed in as {user.primaryEmailAddress?.emailAddress}
          </p>
        )}
      </div>
    </div>
  );
}
