import React, { useState, useMemo } from "react";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { useCollectionRealtime } from "@/lib/firestore-hooks";
import {
  Bell, CheckCheck, Loader2, IndianRupee, Users, AlertCircle,
  UserPlus, UserCheck, CreditCard, FileText, Building2,
  User, TrendingDown, Trash2, SlidersHorizontal, BellOff,
  RefreshCw, CheckCircle2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, deleteDoc, writeBatch, where } from "firebase/firestore";
import { toast } from "sonner";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { Button } from "@/components/ui/button";

type NotifCategory = "all" | "collections" | "customers" | "collectors" | "loans" | "system";

interface Notif {
  id: string;
  title: string;
  message: string;
  read: boolean;
  timestamp: any;
  userId: string;
  organizationId: string;
  type?: string;
  category?: string;
  actorName?: string;
  metadata?: Record<string, any>;
}

const FILTERS: { id: NotifCategory; label: string }[] = [
  { id: "all",         label: "All"         },
  { id: "collections", label: "Collections" },
  { id: "customers",   label: "Customers"   },
  { id: "collectors",  label: "Collectors"  },
  { id: "loans",       label: "Loans"       },
  { id: "system",      label: "System"      },
];

function getCategory(n: Notif): NotifCategory {
  if (n.category) return n.category as NotifCategory;
  const t = (n.type || "").toUpperCase();
  if (["COLLECTION_RECORDED","COLLECTION_UPDATED","DEPOSIT_COLLECTED","EMI_COLLECTED"].some(x => t.includes(x.replace("_",""))) || t.includes("COLLECTION")) return "collections";
  if (["NEW_CUSTOMER","CUSTOMER"].some(x => t.includes(x.replace("_","")))) return "customers";
  if (["NEW_COLLECTOR","COLLECTOR"].some(x => t.includes(x.replace("_","")))) return "collectors";
  if (["LOAN","EMI"].some(x => t.includes(x))) return "loans";
  return "system";
}

const TYPE_META: Record<string, { icon: React.FC<any>; bg: string; iconColor: string; dot: string }> = {
  collections: { icon: IndianRupee, bg: "bg-emerald-50", iconColor: "text-emerald-600", dot: "bg-emerald-500" },
  customers:   { icon: UserPlus,    bg: "bg-sky-50",     iconColor: "text-sky-600",     dot: "bg-sky-500"     },
  collectors:  { icon: UserCheck,   bg: "bg-violet-50",  iconColor: "text-violet-600",  dot: "bg-violet-500"  },
  loans:       { icon: CreditCard,  bg: "bg-indigo-50",  iconColor: "text-indigo-600",  dot: "bg-indigo-500"  },
  system:      { icon: AlertCircle, bg: "bg-amber-50",   iconColor: "text-amber-600",   dot: "bg-amber-500"   },
};

const TYPE_ICONS: Record<string, React.FC<any>> = {
  NEW_CUSTOMER:         UserPlus,
  NEW_COLLECTOR:        UserCheck,
  COLLECTION_RECORDED:  IndianRupee,
  COLLECTION_UPDATED:   IndianRupee,
  DEPOSIT_COLLECTED:    IndianRupee,
  EMI_COLLECTED:        IndianRupee,
  LOAN_APPLIED:         CreditCard,
  LOAN_APPROVED:        CheckCircle2,
  LOAN_REJECTED:        TrendingDown,
  EMI_DUE:              AlertCircle,
  EMI_MISSED:           AlertCircle,
  EMI_OVERDUE:          AlertCircle,
  REPORT_EXPORTED:      FileText,
  PROFILE_UPDATED:      User,
  ORGANIZATION_UPDATED: Building2,
  INVITE:               Users,
};

function getNotifMeta(n: Notif) {
  const cat = getCategory(n);
  const base = TYPE_META[cat] || TYPE_META.system;
  const SpecificIcon = TYPE_ICONS[(n.type || "").toUpperCase()];
  return { ...base, icon: SpecificIcon || base.icon };
}

function tsToDate(ts: any): Date {
  if (!ts) return new Date();
  if (typeof ts.toDate === "function") return ts.toDate();
  return new Date(ts);
}

function groupByDay(items: Notif[]): { label: string; items: Notif[] }[] {
  const today: Notif[] = [], yesterday: Notif[] = [], earlier: Notif[] = [];
  for (const n of items) {
    const d = tsToDate(n.timestamp);
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

export default function OrgNotifications() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { data: rawNotifs, loading } = useCollectionRealtime<Notif>(
    "notifications",
    user ? [where("userId", "==", user.id)] : []
  );
  const [filter, setFilter] = useState<NotifCategory>("all");
  const [clearing, setClearing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const sorted = useMemo(() =>
    [...rawNotifs].sort((a, b) => tsToDate(b.timestamp).valueOf() - tsToDate(a.timestamp).valueOf()),
    [rawNotifs]
  );

  const filtered = useMemo(() =>
    filter === "all" ? sorted : sorted.filter(n => getCategory(n) === filter),
    [sorted, filter]
  );

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const unreadCount = useMemo(() => sorted.filter(n => !n.read).length, [sorted]);
  const filteredUnread = useMemo(() => filtered.filter(n => !n.read).length, [filtered]);

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true, updatedAt: serverTimestamp() });
    } catch {
      toast.error("Could not mark as read.");
    }
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
    } catch {
      toast.error("Failed to update notifications.");
    } finally { setMarkingAll(false); }
  };

  const clearAll = async () => {
    if (!filtered.length) return;
    setClearing(true);
    try {
      const batch = writeBatch(db);
      filtered.forEach(n => batch.delete(doc(db, "notifications", n.id)));
      await batch.commit();
      toast.success("Notifications cleared.");
    } catch {
      toast.error("Failed to clear notifications.");
    } finally { setClearing(false); }
  };

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              Notifications
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-red-500 text-white text-xs font-bold px-1.5">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Real-time alerts — collections, customers, loans & more.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {filteredUnread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                disabled={markingAll}
                className="h-8 text-xs gap-1.5 rounded-xl"
              >
                {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Mark all read</span>
              </Button>
            )}
            {filtered.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={clearing}
                className="h-8 text-xs gap-1.5 rounded-xl text-red-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
              >
                {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Clear all</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── Filter chips ─────────────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {FILTERS.map(f => {
            const count = f.id === "all"
              ? sorted.filter(n => !n.read).length
              : sorted.filter(n => !n.read && getCategory(n) === f.id).length;
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={[
                  "flex items-center gap-1.5 shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all border",
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
              >
                {f.label}
                {count > 0 && (
                  <span className={[
                    "inline-flex items-center justify-center h-4 min-w-4 rounded-full text-[10px] font-bold px-1",
                    isActive ? "bg-white/20 text-white" : "bg-red-500 text-white",
                  ].join(" ")}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-slate-100 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-100 rounded-full w-3/4" />
                <div className="h-3 bg-slate-100 rounded-full w-full" />
                <div className="h-3 bg-slate-100 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        /* ── Empty state ─────────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <BellOff className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">
            {filter === "all" ? "No notifications yet" : `No ${filter} notifications`}
          </h3>
          <p className="text-sm text-slate-400 max-w-xs">
            {filter === "all"
              ? "Alerts will appear here as activity happens in your organization."
              : `Switch to "All" to see everything, or activity in this category hasn't happened yet.`}
          </p>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="mt-4 text-sm font-semibold text-sky-600 hover:text-sky-700"
            >
              View all notifications
            </button>
          )}
        </div>
      ) : (
        /* ── Grouped notification list ───────────────────────────────────── */
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  {group.label}
                </p>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[11px] text-slate-400 shrink-0">{group.items.length}</span>
              </div>
              <div className="space-y-2">
                {group.items.map(n => {
                  const meta = getNotifMeta(n);
                  const Icon = meta.icon;
                  const ts = tsToDate(n.timestamp);
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markRead(n.id)}
                      className={[
                        "relative flex items-start gap-3.5 rounded-2xl border p-4 transition-all",
                        n.read
                          ? "bg-white border-slate-100"
                          : `${meta.bg} border-transparent shadow-sm cursor-pointer hover:shadow-md active:scale-[0.99]`,
                      ].join(" ")}
                    >
                      {/* Unread dot */}
                      {!n.read && (
                        <span className={`absolute top-4 right-4 h-2 w-2 rounded-full ${meta.dot} shadow-sm`} />
                      )}

                      {/* Icon */}
                      <div className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
                        n.read ? "bg-slate-50 border-slate-100" : `${meta.bg} border-white/60`,
                      ].join(" ")}>
                        <Icon className={`h-4.5 w-4.5 ${n.read ? "text-slate-400" : meta.iconColor}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-5">
                        <p className={`text-sm font-semibold leading-snug ${n.read ? "text-slate-500" : "text-slate-900"}`}>
                          {n.title}
                        </p>
                        <p className={`mt-1 text-sm leading-relaxed ${n.read ? "text-slate-400" : "text-slate-600"}`}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] text-slate-400">
                            {formatDistanceToNow(ts, { addSuffix: true })}
                          </span>
                          {n.actorName && (
                            <>
                              <span className="text-slate-200">·</span>
                              <span className="text-[11px] text-slate-400">{n.actorName}</span>
                            </>
                          )}
                          {!n.read && (
                            <>
                              <span className="text-slate-200">·</span>
                              <span className="text-[11px] font-semibold text-sky-500">Tap to mark read</span>
                            </>
                          )}
                        </div>
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
