import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useCollectionRealtimeRaw } from "@/lib/firestore-hooks";
import { Collection, SavingsAccount, Loan, Membership } from "@/types";
import { where, orderBy } from "firebase/firestore";
import { useUser, useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Phone, MessageCircle, IndianRupee, Receipt, UserCheck, Mail, Calendar, TrendingUp, TrendingDown, Activity, Clock, RefreshCw, Loader2, ChevronDown, BadgeCheck, AlertTriangle, BarChart3, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CollectDialog from "@/components/agent/CollectDialog";
import { toast } from "sonner";
import { reassignCustomer } from "@/lib/services";
import { format, isToday, startOfMonth, isThisMonth } from "date-fns";

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

function fmtCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString()}`;
}

function fmtDate(ts: any): string {
  if (!ts) return "—";
  try { return format(toDate(ts), "dd MMM yyyy"); } catch { return "—"; }
}

function fmtDateTime(ts: any): string {
  if (!ts) return "—";
  try { return format(toDate(ts), "dd MMM yyyy, hh:mm a"); } catch { return "—"; }
}

interface Props {
  customer: Membership;
  orgId: string;
  orgName: string;
  onBack: () => void;
  collectors: Membership[];
  currentUser: any;
}

export default function OrgCustomerProfile({ customer, orgId, orgName, onBack, collectors, currentUser }: Props) {
  const { getToken } = useAuth();

  const custId = customer.id;
  const custName = customer.fullName || (customer as any).name || customer.email;
  const phone = customer.phone || "";

  const { data: collections, loading: collectionsLoading } = useCollectionRealtimeRaw<Collection>("collections", [
    where("customerId", "==", custId),
    where("organizationId", "==", orgId),
    orderBy("collectedAt", "desc"),
  ]);

  const { data: savingsAccounts } = useCollectionRealtimeRaw<SavingsAccount>("savings_accounts", [
    where("customerId", "==", custId),
    where("organizationId", "==", orgId),
  ]);

  const { data: loans } = useCollectionRealtimeRaw<Loan>("loans", [
    where("customerId", "==", custId),
    where("organizationId", "==", orgId),
  ]);

  const [collectOpen, setCollectOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [newCollectorId, setNewCollectorId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [clerkUser, setClerkUser] = useState<any>(null);

  useEffect(() => {
    if (!customer.clerkUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/clerk-user/${customer.clerkUserId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setClerkUser(data);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [customer.clerkUserId]);

  const assignedCollector = useMemo(() => {
    const aid = (customer as any).assignedAgentId || "";
    return collectors.find((c: any) => c.clerkUserId === aid || c.id === aid);
  }, [collectors, customer]);

  const totalSavings = useMemo(() =>
    savingsAccounts.reduce((s, a) => s + (a.totalBalance || 0), 0), [savingsAccounts]);

  const activeLoans = useMemo(() =>
    loans.filter(l => ["ACTIVE", "OVERDUE", "PARTIALLY_PAID"].includes((l.status || "").toUpperCase())), [loans]);

  const totalLoanPrincipal = useMemo(() =>
    activeLoans.reduce((s, l) => s + (l.principalAmount || l.principal || 0), 0), [activeLoans]);

  const totalLoanOutstanding = useMemo(() =>
    activeLoans.reduce((s, l) => s + (l.outstandingBalance || l.balanceRemaining || 0), 0), [activeLoans]);

  const totalLoanPaid = totalLoanPrincipal - totalLoanOutstanding;

  const totalAmount = totalSavings + totalLoanPrincipal;
  const totalPaid = totalSavings + totalLoanPaid;
  const totalPending = totalLoanOutstanding;
  const collectionPct = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0;

  const thisMonthCollections = useMemo(() =>
    collections.filter(c => isThisMonth(toDate(c.collectedAt || (c as any).timestamp))), [collections]);

  const thisWeekCollections = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    return collections.filter(c => toDate(c.collectedAt || (c as any).timestamp) >= cutoff);
  }, [collections]);

  const todayCollections = useMemo(() =>
    collections.filter(c => isToday(toDate(c.collectedAt || (c as any).timestamp))), [collections]);

  const lastCollection = collections[0];

  const monthTotal = useMemo(() => thisMonthCollections.reduce((s, c) => s + (c.amount || 0), 0), [thisMonthCollections]);
  const weekTotal = useMemo(() => thisWeekCollections.reduce((s, c) => s + (c.amount || 0), 0), [thisWeekCollections]);
  const avgDaily = useMemo(() => {
    const days = new Date().getDate();
    return days > 0 ? Math.round(monthTotal / days) : 0;
  }, [monthTotal]);

  const overdueLoans = activeLoans.filter(l => (l.status || "").toUpperCase() === "OVERDUE");

  const groupedCollections = useMemo(() => {
    const groups: Record<string, Collection[]> = {};
    collections.forEach(c => {
      const d = toDate(c.collectedAt || (c as any).timestamp);
      const key = format(d, "dd MMM yyyy");
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return groups;
  }, [collections]);

  const handleReassign = async () => {
    if (!newCollectorId || !currentUser?.id) return;
    const newColl = collectors.find(c => c.id === newCollectorId);
    if (!newColl) return;
    setIsReassigning(true);
    try {
      await reassignCustomer({
        customerId: custId,
        newCollectorId: (newColl as any).clerkUserId || newCollectorId,
        newCollectorName: newColl.fullName || (newColl as any).name || "",
        oldCollectorId: (customer as any).assignedAgentId || "",
        oldCollectorName: (customer as any).assignedAgentName || "",
        changedBy: currentUser.id,
        organizationId: orgId,
      });
      toast.success(`${custName} reassigned to ${newColl.fullName || (newColl as any).name}`);
      setReassignOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to reassign");
    } finally {
      setIsReassigning(false);
    }
  };

  const avatarUrl = clerkUser?.imageUrl || customer.profilePhotoUrl || customer.profileImage || customer.avatarUrl || "";
  const initials = (custName || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  const isOverdue = overdueLoans.length > 0;

  const quickStatCards = [
    { label: "Total Amount", value: fmtCurrency(totalAmount), sub: "Savings + Loans", color: "text-slate-900", icon: <IndianRupee className="w-4 h-4 text-slate-400" /> },
    { label: "Paid Amount", value: fmtCurrency(totalPaid), sub: "All time collected", color: "text-emerald-700", icon: <TrendingUp className="w-4 h-4 text-emerald-400" /> },
    { label: "Outstanding", value: fmtCurrency(totalPending), sub: "Remaining balance", color: totalPending > 0 ? "text-rose-600" : "text-slate-400", icon: <TrendingDown className="w-4 h-4 text-rose-400" /> },
    { label: "Collection %", value: `${collectionPct}%`, sub: "Overall progress", color: collectionPct >= 80 ? "text-emerald-700" : collectionPct >= 50 ? "text-amber-600" : "text-rose-600", icon: <Activity className="w-4 h-4 text-sky-400" /> },
  ];

  return (
    <div className="space-y-6">
      {/* ── Back Button ── */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Customers
      </button>

      {/* ── Profile Header ── */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="h-20 bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-500" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="w-20 h-20 border-4 border-white shadow-lg ring-2 ring-slate-100">
                <AvatarImage src={avatarUrl} alt={custName} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-slate-900">{custName}</h1>
                  {(customer as any).status === "ACTIVE" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      <BadgeCheck className="w-3 h-3" /> Active
                    </span>
                  )}
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">
                      <AlertTriangle className="w-3 h-3" /> Overdue
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">ID: {custId.slice(-8).toUpperCase()}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {phone && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {phone}
                    </span>
                  )}
                  {customer.email && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-600 truncate max-w-[200px]">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
                    </span>
                  )}
                  {assignedCollector && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-600">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      {assignedCollector.fullName || (assignedCollector as any).name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                onClick={() => setCollectOpen(true)}
              >
                <IndianRupee className="w-3.5 h-3.5" /> Collect
              </Button>
              {phone && (
                <>
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-500" /> Call
                  </a>
                  <a
                    href={`https://wa.me/91${phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-green-500" /> WhatsApp
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Financial Overview ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStatCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              {card.icon}
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Progress Ring & Bar ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* SVG Ring */}
          <div className="relative shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
              <circle cx="44" cy="44" r="36" fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <circle
                cx="44" cy="44" r="36" fill="none"
                stroke={collectionPct >= 80 ? "#10b981" : collectionPct >= 50 ? "#f59e0b" : "#ef4444"}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - collectionPct / 100)}`}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.8s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-slate-900">{collectionPct}%</span>
            </div>
          </div>
          <div className="flex-1 space-y-3 w-full">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-semibold text-slate-700">Overall Collection Progress</span>
                <span className="text-slate-500">{fmtCurrency(totalPaid)} / {fmtCurrency(totalAmount)}</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${collectionPct}%`,
                    background: collectionPct >= 80 ? "#10b981" : collectionPct >= 50 ? "#f59e0b" : "#ef4444"
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Savings</p>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">{fmtCurrency(totalSavings)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Loan Principal</p>
                <p className="text-sm font-bold text-indigo-700 mt-0.5">{fmtCurrency(totalLoanPrincipal)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Outstanding</p>
                <p className={`text-sm font-bold mt-0.5 ${totalLoanOutstanding > 0 ? "text-rose-600" : "text-slate-400"}`}>{fmtCurrency(totalLoanOutstanding)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Collection Analytics ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-500" /> Collection Analytics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "This Week", value: fmtCurrency(weekTotal), sub: `${thisWeekCollections.length} transactions`, color: "text-indigo-700" },
            { label: "This Month", value: fmtCurrency(monthTotal), sub: `${thisMonthCollections.length} transactions`, color: "text-violet-700" },
            { label: "Avg Daily", value: fmtCurrency(avgDaily), sub: "This month", color: "text-sky-700" },
            { label: "Overdue Loans", value: `${overdueLoans.length}`, sub: overdueLoans.length > 0 ? "Needs attention" : "All current", color: overdueLoans.length > 0 ? "text-rose-600" : "text-emerald-600" },
            { label: "Last Collection", value: lastCollection ? fmtDate(lastCollection.collectedAt || (lastCollection as any).timestamp) : "—", sub: lastCollection ? `₹${(lastCollection.amount || 0).toLocaleString()}` : "No collections yet", color: "text-slate-700" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-slate-400">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Payment History ── */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" /> Payment History
            </h3>
            <span className="text-xs text-slate-400">{collections.length} records</span>
          </div>
          <div className="overflow-y-auto max-h-[480px]">
            {collectionsLoading ? (
              <div className="p-6 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
              </div>
            ) : collections.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No payment records yet.</div>
            ) : (
              (Object.entries(groupedCollections) as [string, Collection[]][]).slice(0, 15).map(([date, cols]) => (
                <div key={date}>
                  <div className="px-5 py-2 bg-slate-50 border-y border-slate-100 flex items-center justify-between sticky top-0 z-10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{date}</span>
                    <span className="text-xs font-semibold text-slate-600">
                      ₹{cols.reduce((s, c) => s + (c.amount || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  {cols.map((col) => {
                    const colDate = toDate(col.collectedAt || (col as any).timestamp);
                    const modeColors: Record<string, string> = { CASH: "bg-amber-100 text-amber-700", UPI: "bg-indigo-100 text-indigo-700", BANK_TRANSFER: "bg-sky-100 text-sky-700" };
                    const typeColors: Record<string, string> = { SAVINGS: "bg-emerald-100 text-emerald-700", LOAN_EMI: "bg-violet-100 text-violet-700", BOTH: "bg-blue-100 text-blue-700" };
                    return (
                      <div key={col.id} className="px-5 py-3 flex items-center gap-3 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 text-sm">₹{(col.amount || 0).toLocaleString()}</span>
                            {col.collectionType && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${typeColors[col.collectionType] || "bg-slate-100 text-slate-600"}`}>
                                {col.collectionType === "LOAN_EMI" ? "EMI" : col.collectionType}
                              </span>
                            )}
                            {col.paymentMode && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${modeColors[col.paymentMode] || "bg-slate-100 text-slate-600"}`}>
                                {col.paymentMode}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-slate-400">{format(colDate, "hh:mm a")}</span>
                            {col.collectedByName && (
                              <span className="text-xs text-slate-500">by {col.collectedByName}</span>
                            )}
                            {col.collectedByRole && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${col.collectedByRole === "OWNER" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>
                                {col.collectedByRole}
                              </span>
                            )}
                            {col.receiptNo && (
                              <span className="text-[10px] font-mono text-slate-400">#{col.receiptNo}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right Column: Agent + Savings + Loans ── */}
        <div className="space-y-4">
          {/* Assigned Agent */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5" /> Assigned Agent
            </h3>
            {assignedCollector ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-sky-100 text-sky-700 font-bold text-sm">
                      {(assignedCollector.fullName || (assignedCollector as any).name || "?").split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {assignedCollector.fullName || (assignedCollector as any).name}
                    </p>
                    <p className="text-xs text-slate-400">{assignedCollector.email}</p>
                  </div>
                </div>
                {assignedCollector.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {assignedCollector.phone}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No agent assigned</p>
            )}

            {collectors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                {reassignOpen ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <select
                        value={newCollectorId}
                        onChange={e => setNewCollectorId(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-7 text-sm text-slate-900 focus:outline-none"
                      >
                        <option value="">Select collector…</option>
                        {collectors.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.fullName || (c as any).name || c.email}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => { setReassignOpen(false); setNewCollectorId(""); }}>
                        Cancel
                      </Button>
                      <Button size="sm" className="flex-1 h-8 text-xs" disabled={!newCollectorId || isReassigning} onClick={handleReassign}>
                        {isReassigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Reassign"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReassignOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Reassign
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Savings Accounts */}
          {savingsAccounts.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-500" /> Savings Accounts
              </h3>
              <div className="space-y-3">
                {savingsAccounts.map((sa) => (
                  <div key={sa.id} className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold text-emerald-800">{sa.planName || sa.planType}</p>
                        <p className="text-lg font-bold text-emerald-900 mt-0.5">₹{(sa.totalBalance || 0).toLocaleString()}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sa.status === "ACTIVE" ? "bg-emerald-200 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                        {sa.status}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 mt-1">₹{sa.scheduledAmount}/instalment · {sa.planType?.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Loans */}
          {activeLoans.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-violet-500" /> Active Loans
              </h3>
              <div className="space-y-3">
                {activeLoans.map((loan) => {
                  const paid = (loan.principalAmount || loan.principal || 0) - (loan.outstandingBalance || loan.balanceRemaining || 0);
                  const total = loan.principalAmount || loan.principal || 0;
                  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                  const isOv = (loan.status || "").toUpperCase() === "OVERDUE";
                  return (
                    <div key={loan.id} className={`rounded-xl border p-3 ${isOv ? "bg-rose-50 border-rose-100" : "bg-violet-50 border-violet-100"}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Principal: ₹{(total).toLocaleString()}</p>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">₹{(loan.outstandingBalance || loan.balanceRemaining || 0).toLocaleString()} outstanding</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOv ? "bg-rose-200 text-rose-700" : "bg-violet-200 text-violet-700"}`}>
                          {loan.status}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">EMI ₹{(loan.emiAmount || 0).toLocaleString()} · {pct}% repaid</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Collect Dialog ── */}
      <CollectDialog
        customer={collectOpen ? customer : null}
        orgId={orgId}
        orgName={orgName}
        agentId={currentUser?.id || ""}
        agentName={currentUser?.fullName || currentUser?.firstName || "Owner"}
        collectedByRole="OWNER"
        collectedById={currentUser?.id || ""}
        onClose={() => setCollectOpen(false)}
      />
    </div>
  );
}
