import React, { useMemo } from "react";
import {
  CreditCard, CalendarDays, TrendingUp,
  FileText, CheckCircle, AlertTriangle, ArrowUpRight,
  Wallet, BarChart3, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { format, isBefore, startOfDay, subMonths, startOfMonth, endOfMonth } from "date-fns";
import type {
  Loan, LoanInstallment, Collection, Notification,
} from "@/types";

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

function safeN(v: any): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

interface Props {
  loans: Loan[];
  installments: LoanInstallment[];
  collections: Collection[];
  notifications: Notification[];
  onNavigate: (tab: string) => void;
}

export default function DashboardTab({
  loans, installments, collections, notifications, onNavigate,
}: Props) {
  const today = startOfDay(new Date());

  const totalReceipts = collections.length;
  const totalCollected = collections.reduce((s, c) => s + safeN(c.amount), 0);

  const activeLoans = loans.filter((l) => (l.status || "").toUpperCase() === "ACTIVE");
  const totalOutstanding = activeLoans.reduce(
    (s, l) => s + safeN(l.outstandingBalance ?? (l as any).balanceRemaining), 0
  );

  const allInstallmentsSorted = [...installments].sort((a, b) => a.installmentNo - b.installmentNo);
  const pendingInstallments = allInstallmentsSorted.filter((i) => i.status !== "PAID");
  const overdueInstallments = pendingInstallments.filter((i) => isBefore(toDate(i.dueDate), today));
  const nextDue = pendingInstallments[0] ?? null;

  const unreadNotifications = notifications.filter((n) => !n.read);

  const monthlyCollections = useMemo(() => {
    const months: { month: string; amount: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d).getTime();
      const end = endOfMonth(d).getTime();
      const filtered = collections.filter((c) => {
        const ts = toDate(c.collectedAt ?? c.timestamp).getTime();
        return ts >= start && ts <= end;
      });
      months.push({
        month: format(d, "MMM"),
        amount: filtered.reduce((s, c) => s + safeN(c.amount), 0),
        count: filtered.length,
      });
    }
    return months;
  }, [collections]);

  const recentReceipts = [...collections]
    .sort((a, b) => toDate(b.collectedAt ?? b.timestamp).getTime() - toDate(a.collectedAt ?? a.timestamp).getTime())
    .slice(0, 5);

  const summaryCards = [
    {
      label: "Total Collected",
      value: `₹${totalCollected.toLocaleString()}`,
      sub: `${totalReceipts} receipts`,
      icon: TrendingUp,
      color: "bg-emerald-500",
      onClick: () => onNavigate("receipts"),
    },
    {
      label: "Loan Outstanding",
      value: `₹${totalOutstanding.toLocaleString()}`,
      sub: `${activeLoans.length} active loan${activeLoans.length !== 1 ? "s" : ""}`,
      icon: CreditCard,
      color: "bg-orange-500",
      onClick: () => onNavigate("loans"),
    },
    {
      label: "Next EMI",
      value: nextDue ? `₹${safeN(nextDue.emiAmount).toLocaleString()}` : "None due",
      sub: nextDue
        ? (overdueInstallments.length > 0
            ? `${overdueInstallments.length} overdue!`
            : toDate(nextDue.dueDate).getTime() > 0
              ? format(toDate(nextDue.dueDate), "MMM d")
              : "—")
        : "All clear",
      icon: overdueInstallments.length > 0 ? AlertTriangle : CalendarDays,
      color: overdueInstallments.length > 0 ? "bg-red-500" : nextDue ? "bg-amber-500" : "bg-slate-400",
      onClick: () => onNavigate("emi_schedule"),
    },
    {
      label: "Total Receipts",
      value: totalReceipts.toString(),
      sub: "All transactions",
      icon: FileText,
      color: "bg-purple-500",
      onClick: () => onNavigate("receipts"),
    },
    {
      label: "Loan Status",
      value: activeLoans.length > 0 ? "ACTIVE" : "NONE",
      sub: activeLoans.length > 0 ? `${activeLoans.length} loan${activeLoans.length !== 1 ? "s" : ""}` : "No active loan",
      icon: activeLoans.length > 0 ? CheckCircle : Activity,
      color: activeLoans.length > 0 ? "bg-teal-500" : "bg-slate-400",
      onClick: () => onNavigate("loans"),
    },
    {
      label: "Notifications",
      value: unreadNotifications.length > 0 ? unreadNotifications.length.toString() : "—",
      sub: unreadNotifications.length > 0 ? "Unread messages" : "All caught up",
      icon: FileText,
      color: unreadNotifications.length > 0 ? "bg-red-500" : "bg-slate-400",
      onClick: () => onNavigate("notifications"),
    },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg px-3 py-2 text-xs">
          <p className="font-bold text-slate-700 dark:text-slate-200">{label}</p>
          <p className="text-emerald-600 font-semibold">₹{safeN(payload[0]?.value).toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Summary grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {summaryCards.map((card) => (
          <button
            key={card.label}
            onClick={card.onClick}
            className={`${card.color} rounded-2xl p-4 text-left transition-transform active:scale-95 hover:opacity-90 group`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-white/80 text-xs font-medium leading-tight">{card.label}</p>
              <card.icon className="w-4 h-4 text-white/70 shrink-0" />
            </div>
            <p className="text-white text-xl font-black leading-tight truncate">{card.value}</p>
            <p className="text-white/70 text-[11px] mt-1 truncate">{card.sub}</p>
          </button>
        ))}
      </div>

      {/* Overdue alert */}
      {overdueInstallments.length > 0 && (
        <button
          onClick={() => onNavigate("emi_schedule")}
          className="w-full flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-left"
        >
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800 dark:text-red-300 text-sm">
              {overdueInstallments.length} EMI{overdueInstallments.length > 1 ? "s" : ""} overdue
            </p>
            <p className="text-red-600 dark:text-red-400 text-xs mt-0.5">
              Tap to view your EMI schedule and avoid penalties
            </p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-red-400 shrink-0 ml-auto mt-0.5" />
        </button>
      )}

      {/* Loan repayment progress */}
      {activeLoans.length > 0 && (() => {
        const loan = activeLoans[0];
        const principal = loan.principalAmount ?? (loan as any).principal ?? 0;
        const outstanding = loan.outstandingBalance ?? (loan as any).balanceRemaining ?? 0;
        const paid = Math.max(0, principal - outstanding);
        const pct = principal > 0 ? Math.round((paid / principal) * 100) : 0;
        const tenure = loan.tenureMonths ?? (loan as any).durationMonths ?? 0;
        const paidInstalls = installments.filter((i) => i.loanId === loan.id && i.status === "PAID").length;
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-orange-500" />
                Loan Repayment Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>Paid: ₹{paid.toLocaleString()}</span>
                    <span className="font-semibold text-slate-700">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-emerald-500 h-3 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{paidInstalls}/{tenure} EMIs paid</span>
                    <span>Remaining: ₹{outstanding.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-slate-500">Principal</p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">₹{safeN(principal).toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-slate-500">EMI/mo</p>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">₹{safeN(loan.emiAmount).toLocaleString()}</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/40 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-orange-500">Outstanding</p>
                  <p className="font-bold text-orange-700 dark:text-orange-400 text-sm">₹{safeN(outstanding).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Monthly collections chart */}
      {monthlyCollections.some((m) => m.amount > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Monthly Collections
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-4 pr-4">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={monthlyCollections} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Receipts */}
      {recentReceipts.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent Receipts</CardTitle>
              <button onClick={() => onNavigate("receipts")} className="text-xs text-emerald-600 font-semibold">
                View all
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {recentReceipts.map((col) => {
                const d = toDate(col.collectedAt ?? col.timestamp);
                const isEMI = col.collectionType === "LOAN_EMI";
                return (
                  <div key={col.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isEMI ? "bg-indigo-50 dark:bg-indigo-950/40" : "bg-emerald-50 dark:bg-emerald-950/40"}`}>
                        {isEMI
                          ? <CreditCard className="w-4 h-4 text-indigo-600" />
                          : <FileText className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {isEMI ? "EMI Payment" : "Collection"}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">{col.receiptNo || "—"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 text-sm">₹{safeN(col.amount).toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{d.getTime() > 0 ? format(d, "MMM d") : "—"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications preview */}
      {unreadNotifications.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {unreadNotifications.length} New Notification{unreadNotifications.length > 1 ? "s" : ""}
              </CardTitle>
              <button onClick={() => onNavigate("notifications")} className="text-xs text-emerald-600 font-semibold">
                View all
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0 mt-2">
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {unreadNotifications.slice(0, 2).map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{n.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {loans.length === 0 && collections.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto mb-3 text-emerald-200" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Welcome to FundCircle!</p>
            <p className="text-sm text-slate-400 mt-1">Your loan and collection activity will appear here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
