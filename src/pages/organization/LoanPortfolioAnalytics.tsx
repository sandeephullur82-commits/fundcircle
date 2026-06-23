import React, { useMemo } from "react";
import { Loan, LoanApplication } from "@/types";
import {
  TrendingUp, TrendingDown, IndianRupee, AlertTriangle,
  Clock, CheckCircle, XCircle, BarChart2,
} from "lucide-react";

interface Props {
  loans: Loan[];
  applications: LoanApplication[];
}

function fmt(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1000)      return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString()}`;
}

export default function LoanPortfolioAnalytics({ loans, applications }: Props) {
  const stats = useMemo(() => {
    const activeLoans   = loans.filter((l) => (l.status || "").toUpperCase() === "ACTIVE");
    const closedLoans   = loans.filter((l) => (l.status || "").toUpperCase() === "CLOSED");
    const rejectedLoans = loans.filter((l) => (l.status || "").toUpperCase() === "REJECTED");
    const pendingApps   = applications.filter((a) => a.status === "PENDING");

    const totalDisbursed = activeLoans.reduce((s, l) => s + (l.principalAmount ?? (l as any).principal ?? 0), 0)
      + closedLoans.reduce((s, l) => s + (l.principalAmount ?? (l as any).principal ?? 0), 0);

    const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstandingBalance ?? (l as any).balanceRemaining ?? 0), 0);

    const totalInterestEarned = closedLoans.reduce((l, loan) => {
      const principal = loan.principalAmount ?? (loan as any).principal ?? 0;
      const emi = loan.emiAmount ?? 0;
      const tenure = loan.tenureMonths ?? (loan as any).durationMonths ?? 0;
      return l + Math.max(0, emi * tenure - principal);
    }, 0);

    const approvalRate = (loans.length + applications.length) > 0
      ? Math.round(((activeLoans.length + closedLoans.length) / (loans.length + applications.length)) * 100)
      : 0;

    const avgLoanAmount = activeLoans.length > 0
      ? activeLoans.reduce((s, l) => s + (l.principalAmount ?? (l as any).principal ?? 0), 0) / activeLoans.length
      : 0;

    const avgTenure = activeLoans.length > 0
      ? activeLoans.reduce((s, l) => s + (l.tenureMonths ?? (l as any).durationMonths ?? 0), 0) / activeLoans.length
      : 0;

    return {
      totalLoans:          loans.length,
      activeLoans:         activeLoans.length,
      closedLoans:         closedLoans.length,
      rejectedLoans:       rejectedLoans.length,
      pendingApplications: pendingApps.length,
      totalDisbursed,
      totalOutstanding,
      totalInterestEarned,
      approvalRate,
      avgLoanAmount,
      avgTenure,
    };
  }, [loans, applications]);

  // Mini bar chart for loan status distribution
  const total = Math.max(1, stats.totalLoans + stats.pendingApplications);
  const bars = [
    { label: "Active",   count: stats.activeLoans,         color: "bg-emerald-500", pct: (stats.activeLoans / total) * 100 },
    { label: "Closed",   count: stats.closedLoans,          color: "bg-slate-400",   pct: (stats.closedLoans / total) * 100 },
    { label: "Pending",  count: stats.pendingApplications,  color: "bg-amber-400",   pct: (stats.pendingApplications / total) * 100 },
    { label: "Rejected", count: stats.rejectedLoans,        color: "bg-red-400",     pct: (stats.rejectedLoans / total) * 100 },
  ];

  return (
    <div className="space-y-3">
      {/* ── Primary metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          {
            icon: IndianRupee,
            label: "Total Disbursed",
            value: fmt(stats.totalDisbursed),
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            icon: TrendingDown,
            label: "Outstanding",
            value: fmt(stats.totalOutstanding),
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            icon: TrendingUp,
            label: "Interest Earned",
            value: fmt(stats.totalInterestEarned),
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            icon: BarChart2,
            label: "Approval Rate",
            value: `${stats.approvalRate}%`,
            color: "text-violet-600",
            bg: "bg-violet-50",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3 border border-white/80`}>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center mb-2 bg-white/70`}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Secondary stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: "Active", count: stats.activeLoans, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "Pending", count: stats.pendingApplications, icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
          { label: "Closed", count: stats.closedLoans, icon: CheckCircle, color: "text-slate-500", bg: "bg-slate-50 border-slate-200" },
          { label: "Rejected", count: stats.rejectedLoans, icon: XCircle, color: "text-red-500", bg: "bg-red-50 border-red-100" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-2xl p-3 border flex items-center gap-3 ${s.bg}`}>
              <Icon className={`w-5 h-5 shrink-0 ${s.color}`} />
              <div>
                <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Distribution bar ── */}
      {stats.totalLoans + stats.pendingApplications > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Portfolio Distribution</p>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {bars.filter((b) => b.count > 0).map((b) => (
              <div
                key={b.label}
                className={`${b.color} transition-all`}
                style={{ width: `${b.pct}%` }}
                title={`${b.label}: ${b.count}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {bars.map((b) => (
              <div key={b.label} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                {b.label} ({b.count})
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-50">
            <div>
              <p className="text-xs text-slate-400">Avg. Loan Amount</p>
              <p className="font-bold text-slate-800 text-sm">{fmt(stats.avgLoanAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Avg. Tenure</p>
              <p className="font-bold text-slate-800 text-sm">{Math.round(stats.avgTenure)} months</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
