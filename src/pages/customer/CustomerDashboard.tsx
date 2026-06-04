import { useState, useEffect } from "react";
import { useUser, useOrganization, useOrganizationList, SignOutButton } from "@clerk/clerk-react";
import {
  LogOut, Wallet, CreditCard, History, ChevronDown, Check, Building2,
  PiggyBank, FileText, CalendarDays, AlertTriangle, CheckCircle, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCollectionRealtime, useDocumentRealtime, useCollectionRealtimeRaw } from "@/lib/firestore-hooks";
import { Collection, Loan, LoanInstallment, SavingsAccount, SavingsTransaction, Membership } from "@/types";
import { format, isBefore, startOfDay } from "date-fns";
import { where } from "firebase/firestore";

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

type Tab = "savings" | "passbook" | "loans" | "emi_schedule" | "receipts";

export default function CustomerDashboard() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { userMemberships, setActive } = useOrganizationList({ userMemberships: { infinite: true } });
  const [activeTab, setActiveTab] = useState<Tab>("savings");
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);

  const orgId = organization?.id || "";
  const clerkUserId = user?.id || "";

  // Membership doc ID for customer
  const membershipId = orgId && clerkUserId ? `${orgId}_${clerkUserId}` : null;

  // Fetch data
  const { data: collections } = useCollectionRealtimeRaw<Collection>("collections", [
    where("customerId", "==", membershipId ?? "__none__"),
  ]);

  const { data: savingsAccounts } = useCollectionRealtimeRaw<SavingsAccount>("savings_accounts", [
    where("customerId", "==", membershipId ?? "__none__"),
  ]);

  const { data: savingsTxs } = useCollectionRealtimeRaw<SavingsTransaction>("savings_transactions", [
    where("customerId", "==", membershipId ?? "__none__"),
  ]);

  const { data: loans } = useCollectionRealtimeRaw<Loan>("loans", [
    where("customerId", "==", membershipId ?? "__none__"),
  ]);

  const { data: installments } = useCollectionRealtimeRaw<LoanInstallment>("loan_installments", [
    where("customerId", "==", membershipId ?? "__none__"),
  ]);

  const { data: orgMembers } = useCollectionRealtime<Membership>("organizationMembers");

  // Derived data
  const savingsAccount = savingsAccounts[0] || null;
  const totalSavings = savingsAccount?.totalBalance || 0;

  const activeLoans = loans.filter((l) => l.status === "ACTIVE" || (l.status as string) === "active");
  const totalOutstanding = activeLoans.reduce((s, l) => s + (l.outstandingBalance ?? (l as any).balanceRemaining ?? 0), 0);

  const today = startOfDay(new Date());
  const allInstallmentsSorted = [...installments].sort((a, b) => a.installmentNo - b.installmentNo);
  const pendingInstallments = allInstallmentsSorted.filter((i) => i.status !== "PAID");
  const overdueInstallments = pendingInstallments.filter((i) => isBefore(toDate(i.dueDate), today));
  const nextDue = pendingInstallments[0] || null;

  const sortedTxs = [...savingsTxs].sort((a, b) =>
    toDate(b.collectedAt).valueOf() - toDate(a.collectedAt).valueOf()
  );

  const sortedCollections = [...collections].sort((a, b) =>
    toDate(b.collectedAt || b.timestamp).valueOf() - toDate(a.collectedAt || a.timestamp).valueOf()
  );

  const orgName = organization?.name || "My Organization";
  const orgs = userMemberships?.data || [];

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "savings", label: "Savings", icon: PiggyBank },
    { id: "passbook", label: "Passbook", icon: History },
    { id: "loans", label: "Loans", icon: CreditCard },
    { id: "emi_schedule", label: "EMI Schedule", icon: CalendarDays },
    { id: "receipts", label: "Receipts", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">
            {user?.firstName?.[0] || "C"}
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm leading-tight">{user?.fullName || "Customer"}</p>
            <p className="text-xs text-slate-500">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Org switcher */}
          {orgs.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                <Building2 className="w-3 h-3" />
                <span className="hidden sm:inline max-w-[120px] truncate">{orgName}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showOrgSwitcher && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-[200px] py-1">
                  {orgs.map((mem) => (
                    <button
                      key={mem.organization.id}
                      onClick={async () => {
                        await setActive?.({ organization: mem.organization.id });
                        setShowOrgSwitcher(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      {mem.organization.id === orgId && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                      <span className="truncate">{mem.organization.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <SignOutButton>
            <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </SignOutButton>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => setActiveTab("savings")}
            className="bg-emerald-600 rounded-2xl p-5 text-white cursor-pointer hover:bg-emerald-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-emerald-100 text-sm font-medium">Total Savings</p>
              <PiggyBank className="w-5 h-5 text-emerald-200" />
            </div>
            <p className="text-3xl font-black">₹{totalSavings.toLocaleString()}</p>
            <p className="text-emerald-200 text-xs mt-1">{savingsTxs.length} deposits</p>
          </div>
          <div
            onClick={() => setActiveTab("loans")}
            className="bg-white rounded-2xl p-5 border border-slate-200 cursor-pointer hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-500 text-sm font-medium">Loan Outstanding</p>
              <CreditCard className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl font-black text-slate-900">₹{totalOutstanding.toLocaleString()}</p>
            <p className="text-slate-400 text-xs mt-1">{activeLoans.length} active loan{activeLoans.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* Next EMI due alert */}
        {nextDue && (
          <div
            onClick={() => setActiveTab("emi_schedule")}
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer ${
              overdueInstallments.length > 0
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            {overdueInstallments.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${overdueInstallments.length > 0 ? "text-red-800" : "text-amber-800"}`}>
                {overdueInstallments.length > 0
                  ? `${overdueInstallments.length} EMI overdue!`
                  : "Next EMI due"}
              </p>
              <p className={`text-xs mt-0.5 ${overdueInstallments.length > 0 ? "text-red-600" : "text-amber-600"}`}>
                ₹{Number(nextDue.emiAmount).toLocaleString()} · {toDate(nextDue.dueDate).getTime() > 0 ? format(toDate(nextDue.dueDate), "MMM d, yyyy") : "—"}
              </p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${overdueInstallments.length > 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
              Installment #{nextDue.installmentNo}
            </span>
          </div>
        )}

        {/* Tab navigation */}
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit min-w-full">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === id ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Savings Balance Tab ──────────────────────────────────────────── */}
        {activeTab === "savings" && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Savings Account Balance</p>
                    <p className="text-4xl font-black text-slate-900 mt-1">₹{totalSavings.toLocaleString()}</p>
                  </div>
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <PiggyBank className="w-8 h-8 text-emerald-600" />
                  </div>
                </div>
                {savingsAccount && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Plan Type</p>
                      <p className="font-semibold text-slate-900 text-sm mt-0.5">{savingsAccount.planType || "DAILY"}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">Status</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${savingsAccount.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {savingsAccount.status || "ACTIVE"}
                      </span>
                    </div>
                    {savingsAccount.scheduledAmount > 0 && (
                      <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                        <p className="text-xs text-slate-500">Scheduled Deposit</p>
                        <p className="font-semibold text-slate-900 text-sm mt-0.5">₹{savingsAccount.scheduledAmount.toLocaleString()} / {(savingsAccount.planType || "DAILY").toLowerCase()}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent savings */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Recent Deposits</CardTitle></CardHeader>
              <CardContent className="p-0">
                {sortedTxs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">No deposits yet.</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {sortedTxs.slice(0, 5).map((tx) => {
                      const d = toDate(tx.collectedAt);
                      return (
                        <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Savings Deposit</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {tx.collectedByName || "Agent"} · {d.getTime() > 0 ? format(d, "MMM d, h:mm a") : "—"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-600">+₹{tx.amount.toLocaleString()}</p>
                            <p className="text-xs text-slate-400">Bal: ₹{tx.balanceAfter.toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Passbook Tab ─────────────────────────────────────────────────── */}
        {activeTab === "passbook" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Savings Passbook</CardTitle>
              <p className="text-xs text-slate-500">Complete deposit history with running balance.</p>
            </CardHeader>
            <CardContent className="p-0">
              {sortedTxs.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No transactions yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                        <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Receipt</th>
                        <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Amount</th>
                        <th className="text-right px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-widest">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedTxs.map((tx) => {
                        const d = toDate(tx.collectedAt);
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 text-slate-600">
                              {d.getTime() > 0 ? format(d, "MMM d, yyyy") : "—"}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{tx.receiptNo}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">+₹{tx.amount.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹{tx.balanceAfter.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Loans Tab ────────────────────────────────────────────────────── */}
        {activeTab === "loans" && (
          <div className="space-y-4">
            {loans.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-slate-400">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No loans on your account.</p>
                </CardContent>
              </Card>
            ) : (
              loans.map((loan) => {
                const st = (loan.status || "").toUpperCase();
                const principal = loan.principalAmount ?? (loan as any).principal ?? 0;
                const outstanding = loan.outstandingBalance ?? (loan as any).balanceRemaining ?? 0;
                const tenure = loan.tenureMonths ?? (loan as any).durationMonths ?? 0;
                const paidInstallments = installments.filter((i) => i.loanId === loan.id && i.status === "PAID").length;
                return (
                  <Card key={loan.id}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900">Loan Account</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{loan.id.slice(-12)}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          st === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : st === "CLOSED" ? "bg-slate-100 text-slate-500 border-slate-200"
                          : st === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-red-50 text-red-700 border-red-100"
                        }`}>
                          {st}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-slate-500">Principal</p>
                          <p className="font-bold text-slate-900">₹{Number(principal).toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-slate-500">Monthly EMI</p>
                          <p className="font-bold text-slate-900">₹{Number(loan.emiAmount ?? 0).toFixed(2)}</p>
                        </div>
                        <div className={`rounded-xl p-3 ${outstanding > 0 ? "bg-orange-50" : "bg-emerald-50"}`}>
                          <p className={`text-xs ${outstanding > 0 ? "text-orange-600" : "text-emerald-600"}`}>Outstanding</p>
                          <p className={`font-bold ${outstanding > 0 ? "text-orange-700" : "text-emerald-700"}`}>
                            {outstanding > 0 ? `₹${Number(outstanding).toLocaleString()}` : "Fully Paid ✓"}
                          </p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-slate-500">Progress</p>
                          <p className="font-bold text-slate-900">{paidInstallments}/{tenure} EMIs</p>
                        </div>
                      </div>
                      {outstanding > 0 && tenure > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Repayment progress</span>
                            <span>{Math.round((paidInstallments / tenure) * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                              className="bg-emerald-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (paidInstallments / tenure) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ── EMI Schedule Tab ─────────────────────────────────────────────── */}
        {activeTab === "emi_schedule" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">EMI Schedule</CardTitle>
              <p className="text-xs text-slate-500">All installments across your loans.</p>
            </CardHeader>
            <CardContent className="p-0">
              {allInstallmentsSorted.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No installments yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {allInstallmentsSorted.map((inst) => {
                    const dueDate = toDate(inst.dueDate);
                    const isOverdue = inst.status !== "PAID" && isBefore(dueDate, today);
                    const isPaid = inst.status === "PAID";
                    return (
                      <div key={inst.id} className={`flex items-center justify-between px-4 py-3 ${isOverdue ? "bg-red-50" : isPaid ? "bg-emerald-50/30" : ""}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isPaid ? "bg-emerald-100" : isOverdue ? "bg-red-100" : "bg-slate-100"}`}>
                            {isPaid ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            ) : isOverdue ? (
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">EMI #{inst.installmentNo}</p>
                            <p className={`text-xs mt-0.5 ${isOverdue ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                              {isOverdue ? "Overdue · " : isPaid ? "Paid · " : "Due · "}
                              {dueDate.getTime() > 0 ? format(dueDate, "MMM d, yyyy") : "—"}
                            </p>
                            {isPaid && inst.receiptNo && (
                              <p className="text-[10px] text-slate-400 font-mono">{inst.receiptNo}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-sm ${isPaid ? "text-emerald-600" : isOverdue ? "text-red-600" : "text-slate-900"}`}>
                            ₹{Number(inst.emiAmount).toFixed(2)}
                          </p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isPaid ? "bg-emerald-100 text-emerald-700" : isOverdue ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                            {isPaid ? "PAID" : isOverdue ? "OVERDUE" : "DUE"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Receipts Tab ─────────────────────────────────────────────────── */}
        {activeTab === "receipts" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Payment Receipts</CardTitle>
              <p className="text-xs text-slate-500">All savings and EMI payment receipts.</p>
            </CardHeader>
            <CardContent className="p-0">
              {sortedCollections.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No receipts yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {sortedCollections.map((col) => {
                    const d = toDate(col.collectedAt || col.timestamp);
                    const isSavings = col.collectionType !== "LOAN_EMI";
                    return (
                      <div key={col.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isSavings ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
                              {isSavings ? "SAVINGS" : "EMI"}
                            </span>
                            <span className="font-mono text-xs text-slate-400">{col.receiptNo || "—"}</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {col.collectedByName || "Agent"} · {d.getTime() > 0 ? format(d, "MMM d, yyyy · h:mm a") : "—"}
                          </p>
                        </div>
                        <p className="font-bold text-emerald-600 text-sm">₹{Number(col.amount).toLocaleString()}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
