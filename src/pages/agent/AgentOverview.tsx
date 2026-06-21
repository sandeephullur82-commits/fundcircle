import { useState } from "react";
import { useCollectionRealtime } from "@/lib/firestore-hooks";
import { Membership, Collection } from "@/types";
import {
  IndianRupee, Clock, Users, Banknote, Smartphone,
  PiggyBank, ListChecks, ReceiptText, RefreshCw, ChevronRight,
} from "lucide-react";
import { format, startOfDay } from "date-fns";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { where } from "firebase/firestore";
import CollectDialog, { toDate } from "@/components/agent/CollectDialog";
import { toast } from "sonner";

interface AgentOverviewProps {
  onSwitchTab: (tab: string) => void;
}

function safeN(v: any) { const n = Number(v); return isFinite(n) ? n : 0; }

export default function AgentOverview({ onSwitchTab }: AgentOverviewProps) {
  const { user }         = useUser();
  const { organization } = useOrganization();

  const agentId   = user?.id || "";
  const agentName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Agent";
  const orgId     = organization?.id || "";
  const orgName   = organization?.name || "FundCircle";

  const { data: allMembers } = useCollectionRealtime<Membership>("organizationMembers", [
    where("role",            "==", "CUSTOMER"),
    where("assignedAgentId", "==", agentId || "NONE"),
  ]);
  const { data: allCollections } = useCollectionRealtime<Collection>("collections", [
    where("agentId", "==", agentId || "NONE"),
  ]);

  const [selectedCustomer, setSelectedCustomer] = useState<Membership | null>(null);

  const today = startOfDay(new Date());

  const todayCollections = allCollections.filter(
    (c) => toDate(c.collectedAt || (c as any).timestamp) >= today
  );

  const todayTotal = todayCollections.reduce((s, c) => s + safeN(c.amount), 0);

  const cashTotal = todayCollections
    .filter((c) => !c.paymentMode || c.paymentMode === "CASH")
    .reduce((s, c) => s + safeN(c.amount), 0);

  const upiTotal = todayCollections
    .filter((c) => c.paymentMode === "UPI")
    .reduce((s, c) => s + safeN(c.amount), 0);

  const activeCustomers = allMembers.filter((m) => (m as any).status === "ACTIVE");

  const pendingCustomers = activeCustomers.filter(
    (c) => !todayCollections.some((col) => col.customerId === c.id || col.customerId === c.clerkUserId)
  );

  const collectedCount = activeCustomers.length - pendingCustomers.length;
  const progressPct    = activeCustomers.length > 0
    ? Math.round((collectedCount / activeCustomers.length) * 100)
    : 0;

  // Recent Activity — last 10 all-time collections
  const recentActivity = [...allCollections]
    .sort((a, b) =>
      toDate(b.collectedAt || (b as any).timestamp).valueOf() -
      toDate(a.collectedAt || (a as any).timestamp).valueOf()
    )
    .slice(0, 10);

  const getMemberName = (col: Collection) => {
    const m = allMembers.find((x) => x.id === col.customerId || x.clerkUserId === col.customerId);
    return (m as any)?.fullName || (m as any)?.name || col.customerId?.slice(-6) || "Customer";
  };

  const handleSync = () => {
    toast.success(navigator.onLine ? "All data is up to date" : "You're offline. Data will sync when reconnected.", {
      icon: navigator.onLine ? "✓" : "📶",
    });
  };

  return (
    <div className="space-y-5">
      {/* ── 4 Summary Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Today's Collection — full width, prominent */}
        <button
          onClick={() => onSwitchTab("collect")}
          className="col-span-2 bg-emerald-600 text-white rounded-2xl p-5 flex items-center justify-between shadow-md active:opacity-90 transition-opacity text-left"
        >
          <div>
            <p className="text-emerald-100 text-sm font-medium">Today's Collection</p>
            <p className="text-4xl font-black mt-0.5">₹{todayTotal.toLocaleString()}</p>
            <p className="text-emerald-200 text-xs mt-1">
              {todayCollections.length} transaction{todayCollections.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <IndianRupee className="w-7 h-7 text-white" />
          </div>
        </button>

        {/* Cash */}
        <button
          onClick={() => onSwitchTab("collect")}
          className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-left active:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
              <Banknote className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">Cash</span>
          </div>
          <p className="text-xl font-black text-slate-900">₹{cashTotal.toLocaleString()}</p>
        </button>

        {/* UPI */}
        <button
          onClick={() => onSwitchTab("collect")}
          className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm text-left active:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">UPI</span>
          </div>
          <p className="text-xl font-black text-slate-900">₹{upiTotal.toLocaleString()}</p>
        </button>

        {/* Pending */}
        <button
          onClick={() => onSwitchTab("collect")}
          className="col-span-2 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between shadow-sm text-left active:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-amber-700">Pending Customers</p>
              <p className="text-2xl font-black text-amber-900">{pendingCustomers.length}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400" />
        </button>
      </div>

      {/* ── Today's Progress ─────────────────────────────────────────────── */}
      {activeCustomers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-700">Today's Progress</span>
            <span className="text-sm font-semibold text-emerald-600">
              {collectedCount}/{activeCustomers.length} collected · {progressPct}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-3 rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "New Collection", icon: PiggyBank,   tab: "collect",   color: "bg-emerald-600 text-white" },
            { label: "Customer List",  icon: Users,        tab: "customers", color: "bg-slate-800 text-white"   },
            { label: "View Receipts",  icon: ReceiptText,  tab: "receipts",  color: "bg-indigo-600 text-white"  },
            { label: "Sync Data",      icon: RefreshCw,    tab: null,        color: "bg-slate-100 text-slate-700" },
          ].map(({ label, icon: Icon, tab, color }) => (
            <button
              key={label}
              onClick={() => tab ? onSwitchTab(tab) : handleSync()}
              className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-semibold text-sm transition-opacity active:opacity-80 ${color}`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700">
            <ListChecks className="w-4 h-4 text-emerald-600 inline mr-1.5 mb-0.5" />
            Recent Activity
          </h2>
          <button onClick={() => onSwitchTab("receipts")} className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <PiggyBank className="w-9 h-9 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No collections yet today.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {recentActivity.map((col) => {
              const d    = toDate(col.collectedAt || (col as any).timestamp);
              const mode = col.paymentMode || "CASH";
              return (
                <div key={col.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      mode === "UPI" ? "bg-blue-100" : "bg-emerald-100"
                    }`}>
                      {mode === "UPI"
                        ? <Smartphone className="w-4 h-4 text-blue-600" />
                        : <Banknote    className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{getMemberName(col)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          mode === "UPI"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>{mode}</span>
                        <span className="text-xs text-slate-400">
                          {d.getTime() > 0 ? format(d, "h:mm a") : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="font-bold text-emerald-600 text-sm shrink-0">
                    +₹{safeN(col.amount).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CollectDialog
        customer={selectedCustomer}
        orgId={orgId}
        orgName={orgName}
        agentId={agentId}
        agentName={agentName}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}
