import { useState, useMemo } from "react";
import { useCollectionRealtime } from "@/lib/firestore-hooks";
import { Collection, Loan, LoanInstallment, Membership } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { format, startOfMonth, subMonths, isBefore, startOfDay, differenceInDays } from "date-fns";
import { Download, TrendingUp, PieChart as PieIcon, AlertTriangle, Loader2 } from "lucide-react";
import { exportCollectionsReport } from "@/lib/exportExcel";
import { createAuditLog } from "@/lib/services";
import { toast } from "sonner";
import { useOrganization, useUser } from "@clerk/clerk-react";

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function OrgReports() {
  const { data: collections } = useCollectionRealtime<Collection>("collections");
  const { data: loans } = useCollectionRealtime<Loan>("loans");
  const { data: installments } = useCollectionRealtime<LoanInstallment>("loan_installments");
  const { data: members } = useCollectionRealtime<Membership>("organizationMembers");
  const { data: savingsAccounts } = useCollectionRealtime<any>("savings_accounts");
  const { organization } = useOrganization();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<"overview" | "emi_aging" | "savings" | "portfolio">("overview");
  const [exporting, setExporting] = useState(false);

  const now = new Date();
  const today = startOfDay(now);

  // ── 12-month collection data ─────────────────────────────────────────────
  const monthlyCollections = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const monthStart = startOfMonth(subMonths(now, 11 - i));
    const monthEnd = startOfMonth(subMonths(now, 10 - i));
    const cols = collections.filter((c) => {
      const d = toDate(c.collectedAt || c.timestamp);
      return d >= monthStart && d < monthEnd;
    });
    return {
      month: format(monthStart, "MMM 'yy"),
      savings: cols.reduce((s, c) => {
        if (c.collectionType === "SAVINGS")  return s + Number(c.amount);
        if (c.collectionType === "BOTH")     return s + Number((c as any).savingsAmount || 0);
        return s;
      }, 0),
      emi: cols.reduce((s, c) => {
        if (c.collectionType === "LOAN_EMI") return s + Number(c.amount);
        if (c.collectionType === "BOTH")     return s + Number((c as any).loanAmount || 0);
        return s;
      }, 0),
      total: cols.reduce((s, c) => s + Number(c.amount), 0),
    };
  }), [collections]);

  // ── EMI Aging buckets ──────────────────────────────────────────────────────
  const emiAging = useMemo(() => {
    const overdueInsts = installments.filter((inst) => {
      if (inst.status === "PAID") return false;
      return isBefore(toDate(inst.dueDate), today);
    });
    const buckets = { "1–30 days": 0, "31–60 days": 0, "61–90 days": 0, "90+ days": 0 };
    overdueInsts.forEach((inst) => {
      const days = differenceInDays(today, toDate(inst.dueDate));
      if (days <= 30) buckets["1–30 days"] += inst.emiAmount;
      else if (days <= 60) buckets["31–60 days"] += inst.emiAmount;
      else if (days <= 90) buckets["61–90 days"] += inst.emiAmount;
      else buckets["90+ days"] += inst.emiAmount;
    });
    return Object.entries(buckets).map(([range, amount]) => ({ range, amount, count: overdueInsts.filter((i) => {
      const days = differenceInDays(today, toDate(i.dueDate));
      if (range === "1–30 days") return days >= 1 && days <= 30;
      if (range === "31–60 days") return days >= 31 && days <= 60;
      if (range === "61–90 days") return days >= 61 && days <= 90;
      return days > 90;
    }).length }));
  }, [installments, today]);

  const totalOverdue = emiAging.reduce((s, b) => s + b.amount, 0);

  // ── Loan portfolio pie ─────────────────────────────────────────────────────
  const loanPortfolio = useMemo(() => {
    const active = loans.filter(l => (l.status || "").toUpperCase() === "ACTIVE").length;
    const pending = loans.filter(l => (l.status || "").toUpperCase() === "PENDING").length;
    const closed = loans.filter(l => (l.status || "").toUpperCase() === "CLOSED").length;
    const rejected = loans.filter(l => (l.status || "").toUpperCase() === "REJECTED").length;
    return [
      { name: "Active", value: active },
      { name: "Pending", value: pending },
      { name: "Closed", value: closed },
      { name: "Rejected", value: rejected },
    ].filter(d => d.value > 0);
  }, [loans]);

  // ── Savings growth per agent ───────────────────────────────────────────────
  const agentPerformance = useMemo(() => {
    const agents = members.filter((m) => ["AGENT", "PIGMY_COLLECTOR", "agent"].includes(m.role as string));
    return agents.map((agent) => {
      const agentCols = collections.filter((c) => c.agentId === agent.id || c.agentId === agent.clerkUserId);
      return {
        name: (agent as any).fullName || (agent as any).name || agent.email?.split("@")[0] || "Agent",
        collections: agentCols.length,
        amount: agentCols.reduce((s, c) => s + Number(c.amount), 0),
      };
    }).sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [collections, members]);

  // ── Export Excel ──────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportCollectionsReport({
        orgName: organization?.name || "FundCircle Organization",
        collections,
        members,
        loans,
        installments,
        savingsAccounts,
      });
      toast.success("Excel report downloaded successfully!");
      if (organization?.id && user?.id) {
        createAuditLog({
          organizationId: organization.id,
          actorId: user.id,
          actorRole: "OWNER",
          actorName: user.fullName || user.firstName || "",
          action: "EXCEL_EXPORTED",
          module: "REPORTS",
          category: "EXPORT",
          entityType: "Report",
          entityId: organization.id,
          description: `${user.fullName || "Owner"} downloaded Excel analytics report`,
          metadata: { tab: activeTab, exportedAt: new Date().toISOString() },
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "emi_aging", label: "EMI Aging" },
    { id: "savings", label: "Agent Performance" },
    { id: "portfolio", label: "Loan Portfolio" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-500 text-sm">Financial intelligence — collections, loans, EMI aging, agent performance.</p>
        </div>
        <Button
          onClick={handleExportExcel}
          disabled={exporting}
          variant="outline"
          className="gap-2 shrink-0 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
        >
          {exporting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
            : <><Download className="w-4 h-4" /> Export Excel</>
          }
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.id ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Collected (12m)", value: `₹${monthlyCollections.reduce((s, m) => s + m.total, 0).toLocaleString()}` },
              { label: "Savings Collected", value: `₹${monthlyCollections.reduce((s, m) => s + m.savings, 0).toLocaleString()}` },
              { label: "EMI Collected", value: `₹${monthlyCollections.reduce((s, m) => s + m.emi, 0).toLocaleString()}` },
              { label: "Total Loans", value: loans.length.toString() },
            ].map((stat) => (
              <Card key={stat.label} className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                  <p className="text-xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Monthly collections chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500" /> Monthly Collections — Last 12 Months
              </CardTitle>
              <CardDescription>Savings vs EMI collections over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyCollections} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [`₹${value.toLocaleString()}`, name === "savings" ? "Savings" : "EMI"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend />
                  <Bar dataKey="savings" name="Savings" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="emi" name="EMI" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* EMI Aging */}
      {activeTab === "emi_aging" && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Total Overdue EMIs: ₹{totalOverdue.toLocaleString()}</p>
              <p className="text-xs text-red-600">Outstanding EMI installments past their due date.</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">EMI Aging Analysis</CardTitle>
              <CardDescription>Overdue EMI amounts bucketed by days past due</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={emiAging} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, "Overdue Amount"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="amount" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Aging table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Aging Bucket</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Installments</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {emiAging.map((bucket) => (
                    <tr key={bucket.range} className={bucket.range === "90+ days" ? "bg-red-50" : ""}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{bucket.range}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{bucket.count}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">₹{bucket.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-4 py-3 font-black text-slate-900">Total</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900">
                      {emiAging.reduce((s, b) => s + b.count, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-red-700">₹{totalOverdue.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Agent Performance */}
      {activeTab === "savings" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Collection Performance</CardTitle>
              <CardDescription>Total amount collected per agent (all time)</CardDescription>
            </CardHeader>
            <CardContent>
              {agentPerformance.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No agent data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={agentPerformance} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, "Amount"]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Bar dataKey="amount" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Agent table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Agent</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Collections</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agentPerformance.map((agent, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-semibold text-slate-900">{agent.name}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{agent.collections}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">₹{agent.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loan Portfolio */}
      {activeTab === "portfolio" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-slate-500" /> Loan Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loanPortfolio.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-8">No loans available.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={loanPortfolio}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {loanPortfolio.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Outstanding Balance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Total Principal Disbursed", value: loans.filter(l => l.status === "ACTIVE").reduce((s, l) => s + (l.principalAmount ?? (l as any).principal ?? 0), 0) },
                  { label: "Total Outstanding Balance", value: loans.filter(l => l.status === "ACTIVE").reduce((s, l) => s + (l.outstandingBalance ?? (l as any).balanceRemaining ?? 0), 0) },
                  { label: "Total EMI Collected", value: collections.filter((c) => c.collectionType === "LOAN_EMI").reduce((s, c) => s + Number(c.amount), 0) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm text-slate-600">{item.label}</span>
                    <span className="font-bold text-slate-900">₹{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
