import { useState, useEffect, useRef, useMemo } from "react";
import { useCollectionRealtime } from "@/lib/firestore-hooks";
import { Membership, Collection } from "@/types";
import {
  IndianRupee, Clock, Users, Banknote, Smartphone,
  PiggyBank, ReceiptText, CheckCircle2, Plus, X,
} from "lucide-react";
import { startOfDay } from "date-fns";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { where } from "firebase/firestore";
import CollectDialog, { toDate } from "@/components/agent/CollectDialog";
import { motion, AnimatePresence } from "framer-motion";

interface AgentOverviewProps {
  onSwitchTab: (tab: string) => void;
}

function safeN(v: any): number { const n = Number(v); return isFinite(n) ? n : 0; }

function formatINR(amount: number): string {
  if (amount >= 10_000_000) {
    const cr = amount / 10_000_000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, "")} Cr`;
  }
  if (amount >= 100_000) {
    const l = amount / 100_000;
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1).replace(/\.?0+$/, "")} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function AgentOverview({ onSwitchTab }: AgentOverviewProps) {
  const { user }         = useUser();
  const { organization } = useOrganization();

  const agentId   = user?.id || "";
  const agentName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Agent";
  const orgId     = organization?.id || "";
  const orgName   = organization?.name || "FundCircle";

  const [selectedCustomer, setSelectedCustomer] = useState<Membership | null>(null);
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // ── Data Queries ─────────────────────────────────────────────────────────────
  const { data: allMembers } = useCollectionRealtime<Membership>("organizationMembers", [
    where("role",            "==", "CUSTOMER"),
    where("assignedAgentId", "==", agentId || "NONE"),
  ]);

  const { data: allCollections } = useCollectionRealtime<Collection>("collections", [
    where("agentId", "==", agentId || "NONE"),
  ]);

  // ── Computed values ───────────────────────────────────────────────────────────
  const today = useMemo(() => startOfDay(new Date()), []);

  const todayCollections = useMemo(
    () => allCollections.filter(c => toDate(c.collectedAt || (c as any).timestamp) >= today),
    [allCollections, today]
  );

  const activeCustomers = useMemo(
    () => allMembers.filter(m => (m as any).status === "ACTIVE"),
    [allMembers]
  );

  const collectedCustomers = useMemo(
    () => activeCustomers.filter(c =>
      todayCollections.some(col => col.customerId === c.id || col.customerId === c.clerkUserId)
    ),
    [activeCustomers, todayCollections]
  );

  const pendingCustomers = useMemo(
    () => activeCustomers.filter(c =>
      !todayCollections.some(col => col.customerId === c.id || col.customerId === c.clerkUserId)
    ),
    [activeCustomers, todayCollections]
  );

  const cashCollections = useMemo(
    () => todayCollections.filter(c => !c.paymentMode || c.paymentMode === "CASH"),
    [todayCollections]
  );
  const upiCollections = useMemo(
    () => todayCollections.filter(c => c.paymentMode === "UPI"),
    [todayCollections]
  );

  const todayTotal = useMemo(() => todayCollections.reduce((s, c) => s + safeN(c.amount), 0), [todayCollections]);
  const cashTotal  = useMemo(() => cashCollections.reduce((s, c) => s + safeN(c.amount), 0), [cashCollections]);
  const upiTotal   = useMemo(() => upiCollections.reduce((s, c) => s + safeN(c.amount), 0), [upiCollections]);

  // Close FAB on outside tap
  useEffect(() => {
    if (!fabOpen) return;
    const fn = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) setFabOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [fabOpen]);

  const fabActions = [
    { label: "Generate Receipt", icon: ReceiptText, tab: "receipts",  color: "bg-indigo-600" },
    { label: "Customer List",    icon: Users,        tab: "customers", color: "bg-slate-800"  },
    { label: "New Collection",   icon: PiggyBank,    tab: "collect",   color: "bg-emerald-600" },
  ];

  return (
    <div className="space-y-3 pb-28">

      {/* ── Section 1: Customer Statistics ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-slate-100">
          <StatCell
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            value={collectedCustomers.length}
            label="Collected"
            valueClass="text-emerald-600"
          />
          <StatCell
            icon={<Clock className="w-3.5 h-3.5 text-amber-500" />}
            value={pendingCustomers.length}
            label="Pending"
            valueClass="text-amber-600"
          />
          <StatCell
            icon={<Users className="w-3.5 h-3.5 text-blue-500" />}
            value={activeCustomers.length}
            label="Total"
            valueClass="text-slate-800"
          />
        </div>
        {/* Slim progress bar */}
        {activeCustomers.length > 0 && (
          <div className="px-4 pb-3">
            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
              <motion.div
                className="bg-emerald-500 h-1 rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.round((collectedCustomers.length / activeCustomers.length) * 100)}%`,
                }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Today's Collection ───────────────────────────────────── */}
      <button
        onClick={() => onSwitchTab("collect")}
        className="w-full text-left bg-emerald-600 rounded-2xl p-5 flex items-center justify-between shadow-md active:scale-[0.98] transition-transform"
      >
        <div>
          <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1">
            Today's Collection
          </p>
          <p className="text-4xl font-black text-white tracking-tight leading-none">
            {formatINR(todayTotal)}
          </p>
          <p className="text-emerald-200 text-xs mt-2">
            {todayCollections.length} transaction{todayCollections.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
          <IndianRupee className="w-6 h-6 text-white" />
        </div>
      </button>

      {/* ── Section 3: Cash + UPI ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onSwitchTab("collect")}
          className="bg-white border border-slate-100 rounded-2xl p-4 text-left shadow-sm active:scale-[0.97] transition-transform"
        >
          <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center mb-3">
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Cash</p>
          <p className="text-xl font-black text-slate-900 tracking-tight leading-none">
            {formatINR(cashTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
            {cashCollections.length} collection{cashCollections.length !== 1 ? "s" : ""}
          </p>
        </button>

        <button
          onClick={() => onSwitchTab("collect")}
          className="bg-white border border-slate-100 rounded-2xl p-4 text-left shadow-sm active:scale-[0.97] transition-transform"
        >
          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
            <Smartphone className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">UPI</p>
          <p className="text-xl font-black text-slate-900 tracking-tight leading-none">
            {formatINR(upiTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
            {upiCollections.length} collection{upiCollections.length !== 1 ? "s" : ""}
          </p>
        </button>
      </div>

      {/* ── FAB with inline action menu ──────────────────────────────────────── */}
      <div ref={fabRef} className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-40 flex flex-col items-end gap-3">
        <AnimatePresence>
          {fabOpen && (
            <motion.div
              className="flex flex-col items-end gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {fabActions.map(({ label, icon: Icon, tab, color }, i) => (
                <motion.button
                  key={label}
                  onClick={() => { setFabOpen(false); onSwitchTab(tab); }}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-lg text-white text-sm font-semibold ${color} active:scale-95`}
                  initial={{ opacity: 0, y: 16, scale: 0.88 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.92 }}
                  transition={{ duration: 0.18, delay: i * 0.05, ease: "easeOut" }}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setFabOpen(o => !o)}
          className="w-14 h-14 bg-emerald-600 rounded-full shadow-xl flex items-center justify-center text-white"
          whileTap={{ scale: 0.9 }}
          animate={{ rotate: fabOpen ? 45 : 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          aria-label={fabOpen ? "Close" : "Open actions"}
        >
          {fabOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.button>
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

function StatCell({ icon, value, label, valueClass }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  valueClass: string;
}) {
  return (
    <div className="flex flex-col items-center py-3.5 gap-0.5">
      <div className="flex items-center gap-1 mb-0.5">{icon}</div>
      <span className={`text-2xl font-black leading-none ${valueClass}`}>{value}</span>
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{label}</span>
    </div>
  );
}
