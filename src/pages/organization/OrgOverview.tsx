import { useCollectionRealtime } from "@/lib/firestore-hooks";
import { Collection, Loan, Membership, LoanInstallment } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, CreditCard, TrendingUp, IndianRupee,
  UserCheck, CalendarDays, AlertTriangle, PiggyBank,
} from "lucide-react";
import { format, startOfDay, startOfMonth, subMonths, isBefore } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

export default function OrgOverview() {
  const { data: collections, loading: collLoading } = useCollectionRealtime<Collection>("collections");
  const { data: members, loading: membersLoading } = useCollectionRealtime<Membership>("organizationMembers");
  const { data: loans, loading: loansLoading } = useCollectionRealtime<Loan>("loans");
  const { data: savingsAccounts, loading: savLoading } = useCollectionRealtime<any>("savings_accounts");
  const { data: installments, loading: instLoading } = useCollectionRealtime<LoanInstallment>("loan_installments");

  const isLoading = collLoading || membersLoading || loansLoading || savLoading || instLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 w-48 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  const customers = members.filter((u) => ["CUSTOMER", "customer"].includes(u.role as string));
  const agents = members.filter((u) => ["AGENT", "PIGMY_COLLECTOR", "agent"].includes(u.role as string));
  const activeAgents = agents.filter((a: any) => (a.status || "").toUpperCase() === "ACTIVE");
  const activeCustomers = customers.filter((c: any) => (c.status || "").toUpperCase() === "ACTIVE");

  const today = startOfDay(new Date());
  const todayCollections = collections.filter((c) => toDate(c.collectedAt || c.timestamp) >= today);
  const todayTotal = todayCollections.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const totalSavings = savingsAccounts.reduce((s: number, a: any) => s + (Number(a.totalBalance) || 0), 0);
  const activeLoans = loans.filter((l) => l.status === "ACTIVE" || (l.status as string) === "active");
  const pendingLoans = loans.filter((l) => l.status === "PENDING" || (l.status as string) === "pending");
  const totalLoanOutstanding = activeLoans.reduce((s, l) => s + (l.outstandingBalance ?? (l as any).balanceRemaining ?? 0), 0);

  const pendingEMIs = installments.filter((inst) => {
    if (inst.status === "PAID") return false;
    return isBefore(toDate(inst.dueDate), new Date());
  });

  const overdueLoansCount = new Set(
    installments
      .filter((inst) => inst.status !== "PAID" && isBefore(toDate(inst.dueDate), today))
      .map((inst) => inst.loanId)
  ).size;

  const now = new Date();
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthStart = startOfMonth(subMonths(now, 11 - i));
    const monthEnd = startOfMonth(subMonths(now, 10 - i));
    const total = collections
      .filter((c) => {
        const d = toDate(c.collectedAt || c.timestamp);
        return d >= monthStart && d < monthEnd;
      })
      .reduce((s, c) => s + (Number(c.amount) || 0), 0);
    return { month: format(monthStart, "MMM"), amount: total };
  });

  const recentCollections = [...collections]
    .sort((a, b) => toDate(b.collectedAt || b.timestamp).valueOf() - toDate(a.collectedAt || a.timestamp).valueOf())
    .slice(0, 6);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">Dashboard Overview</h2>
        <p className="text-slate-500 text-sm">Real-time operational intelligence for your organization.</p>
      </div>

      {/* 8 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          title="Total Savings"
          value={`₹${totalSavings.toLocaleString()}`}
          icon={<PiggyBank className="w-5 h-5 text-emerald-600" />}
          trend="Combined customer savings balances"
          bg="bg-emerald-50"
        />
        <MetricCard
          title="Loans Outstanding"
          value={`₹${totalLoanOutstanding.toLocaleString()}`}
          icon={<CreditCard className="w-5 h-5 text-orange-600" />}
          trend={`${activeLoans.length} active loans`}
          bg="bg-orange-50"
        />
        <MetricCard
          title="Today's Collections"
          value={`₹${todayTotal.toLocaleString()}`}
          icon={<IndianRupee className="w-5 h-5 text-blue-600" />}
          trend={`${todayCollections.length} transaction${todayCollections.length !== 1 ? "s" : ""} today`}
          bg="bg-blue-50"
        />
        <MetricCard
          title="Active Customers"
          value={activeCustomers.length.toString()}
          icon={<Users className="w-5 h-5 text-violet-600" />}
          trend={`${customers.length} total registered`}
          bg="bg-violet-50"
        />
        <MetricCard
          title="Active Agents"
          value={activeAgents.length.toString()}
          icon={<UserCheck className="w-5 h-5 text-sky-600" />}
          trend={`${agents.length} total collectors`}
          bg="bg-sky-50"
        />
        <MetricCard
          title="Pending EMIs"
          value={pendingEMIs.length.toString()}
          icon={<CalendarDays className="w-5 h-5 text-amber-600" />}
          trend="Due or overdue installments"
          bg="bg-amber-50"
        />
        <MetricCard
          title="Overdue Loans"
          value={overdueLoansCount.toString()}
          icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
          trend="Loans with missed installments"
          bg="bg-red-50"
        />
        <MetricCard
          title="Pending Approvals"
          value={pendingLoans.length.toString()}
          icon={<TrendingUp className="w-5 h-5 text-teal-600" />}
          trend="Loan applications awaiting review"
          bg="bg-teal-50"
        />
      </div>

      {/* Monthly Collection Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            Monthly Collection Summary — Last 12 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`}
              />
              <Tooltip
                formatter={(value: number) => [`₹${value.toLocaleString()}`, "Collections"]}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader><CardTitle className="text-base">Recent Collections</CardTitle></CardHeader>
          <CardContent>
            {recentCollections.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No collections recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {recentCollections.map((col) => {
                  const customer = members.find((m) => m.id === col.customerId || m.clerkUserId === col.customerId);
                  const d = toDate(col.collectedAt || col.timestamp);
                  const isSavings = col.collectionType !== "LOAN_EMI";
                  return (
                    <div key={col.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="font-semibold text-sm text-slate-900">
                          {(customer as any)?.fullName || (customer as any)?.name || col.customerId?.slice(-6)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSavings ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
                            {isSavings ? "SAVINGS" : "EMI"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {col.collectedByName || "Agent"} · {d.getTime() > 0 ? format(d, "MMM d, h:mm a") : "—"}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 text-sm">+₹{Number(col.amount).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Add Customer", tab: "customers", color: "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100" },
              { label: "Add Agent", tab: "agents", color: "bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100" },
              { label: "New Loan Application", tab: "loans", color: "bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100" },
              { label: "View Reports", tab: "reports", color: "bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100" },
              { label: "Audit Logs", tab: "auditLogs", color: "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100" },
            ].map((action) => (
              <button
                key={action.tab}
                onClick={() => window.dispatchEvent(new CustomEvent("fundcircle:switchTab", { detail: action.tab }))}
                className={`w-full p-3 rounded-xl border text-sm font-semibold text-left transition-colors ${action.color}`}
              >
                {action.label}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, bg }: {
  title: string; value: string; icon: React.ReactNode; trend: string; bg: string;
}) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-slate-500 leading-tight pr-1">{title}</h3>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${bg}`}>{icon}</div>
        </div>
        <p className="text-xl md:text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-[10px] text-slate-400 mt-1 leading-tight">{trend}</p>
      </CardContent>
    </Card>
  );
}
