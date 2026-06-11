import React, { useState } from "react";
import { useCollectionRealtime, useDocumentRealtime } from "@/lib/firestore-hooks";
import { Collection, Membership, SavingsAccount, Loan, LoanInstallment } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  IndianRupee, Search, CheckCircle, Loader2, PiggyBank, Users, Clock,
  CreditCard, Layers,
} from "lucide-react";
import { format, startOfDay } from "date-fns";
import { useUser, useOrganization } from "@clerk/clerk-react";
import {
  recordSavingsCollection,
  recordEMICollection,
  recordCombinedCollection,
  getSavingsAccountByCustomer,
  getActiveLoanForCustomer,
  getNextPendingInstallment,
} from "@/lib/services";
import { where } from "firebase/firestore";
import ReceiptModal, { ReceiptData } from "@/components/ReceiptModal";
import FieldError from "@/components/ui/FieldError";

type CollectMode = "SAVINGS" | "LOAN" | "COMBINED" | null;

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

function getCustomerType(c: any): "SAVINGS" | "LOAN" | "SAVINGS_LOAN" {
  return (c.customerType as "SAVINGS" | "LOAN" | "SAVINGS_LOAN") || "SAVINGS_LOAN";
}

const TYPE_BADGE: Record<string, string> = {
  SAVINGS:      "bg-emerald-100 text-emerald-700",
  LOAN:         "bg-indigo-100 text-indigo-700",
  SAVINGS_LOAN: "bg-violet-100 text-violet-700",
};
const TYPE_LABEL: Record<string, string> = {
  SAVINGS: "Savings", LOAN: "Loan", SAVINGS_LOAN: "S+L",
};

export default function AgentOverview() {
  const { user } = useUser();
  const { organization } = useOrganization();

  const agentId   = user?.id || "";
  const agentName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Agent";
  const orgId     = organization?.id || "";

  const { data: allMembers } = useCollectionRealtime<Membership>("organizationMembers", [
    where("role", "==", "CUSTOMER"),
    where("assignedAgentId", "==", agentId || "NONE"),
  ]);
  const { data: collections } = useCollectionRealtime<Collection>("collections", [
    where("agentId", "==", agentId || "NONE"),
  ]);
  const { data: orgDoc } = useDocumentRealtime<any>("organizations", orgId || null);

  const today           = startOfDay(new Date());
  const todayCollections = collections.filter((c) => toDate(c.collectedAt || c.timestamp) >= today);
  const todayTotal      = todayCollections.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  const activeCustomers = allMembers.filter((m) => (m as any).status === "ACTIVE");

  const pendingCustomers = activeCustomers.filter((c) =>
    !todayCollections.some((col) => col.customerId === c.id || col.customerId === c.clerkUserId)
  );

  // ── Collection Dialog state ────────────────────────────────────────────────
  const [search,           setSearch]           = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Membership | null>(null);
  const [collectMode,      setCollectMode]      = useState<CollectMode>(null);
  const [savingsAccount,   setSavingsAccount]   = useState<SavingsAccount | null>(null);
  const [activeLoan,       setActiveLoan]       = useState<Loan | null>(null);
  const [nextInstallment,  setNextInstallment]  = useState<LoanInstallment | null>(null);
  const [loadingDetails,   setLoadingDetails]   = useState(false);

  const [savingsAmount, setSavingsAmount] = useState("");
  const [emiAmount,     setEmiAmount]     = useState("");
  const [savingsError,  setSavingsError]  = useState("");
  const [emiError,      setEmiError]      = useState("");
  const [submitting,    setSubmitting]    = useState(false);
  const [receipt,       setReceipt]       = useState<ReceiptData | null>(null);

  const filteredCustomers = activeCustomers.filter((c) => {
    const name = (c as any).fullName || (c as any).name || c.email || "";
    return !search || name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search);
  });

  const handleSelectCustomer = async (customer: Membership) => {
    setSelectedCustomer(customer);
    setSavingsAmount("");
    setEmiAmount("");
    setSavingsError("");
    setEmiError("");
    setSavingsAccount(null);
    setActiveLoan(null);
    setNextInstallment(null);
    setLoadingDetails(true);

    const cType = getCustomerType(customer);

    try {
      if (cType === "SAVINGS") {
        setCollectMode("SAVINGS");
        const acc = await getSavingsAccountByCustomer(customer.id, orgId);
        setSavingsAccount(acc);

      } else if (cType === "LOAN") {
        setCollectMode("LOAN");
        const loan = await getActiveLoanForCustomer(customer.id, orgId);
        setActiveLoan(loan);
        if (loan) {
          const inst = await getNextPendingInstallment(loan.id);
          setNextInstallment(inst);
          if (inst) setEmiAmount(String(inst.emiAmount || ""));
        }

      } else {
        // SAVINGS_LOAN — try to detect mode from what's active
        const [acc, loan] = await Promise.all([
          getSavingsAccountByCustomer(customer.id, orgId),
          getActiveLoanForCustomer(customer.id, orgId),
        ]);
        setSavingsAccount(acc);
        setActiveLoan(loan);
        if (loan) {
          const inst = await getNextPendingInstallment(loan.id);
          setNextInstallment(inst);
          if (inst) setEmiAmount(String(inst.emiAmount || ""));
        }
        // If both exist → COMBINED; if only savings → SAVINGS; if only loan → LOAN
        if (acc && loan) setCollectMode("COMBINED");
        else if (acc)    setCollectMode("SAVINGS");
        else if (loan)   setCollectMode("LOAN");
        else             setCollectMode("COMBINED"); // show both fields, both will fail gracefully
      }
    } catch (e) {
      console.error("[AgentOverview] Failed to load customer details", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleClose = () => {
    setSelectedCustomer(null);
    setCollectMode(null);
  };

  // ── Savings-only collection ────────────────────────────────────────────────
  const handleCollectSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !user?.id) return;
    const num = Number(savingsAmount);
    if (!savingsAmount.trim()) { setSavingsError("Collection amount is required"); return; }
    if (isNaN(num) || num <= 0) { setSavingsError("Amount must be greater than 0"); return; }
    if (num > 1_000_000) { setSavingsError("Amount cannot exceed ₹10,00,000"); return; }
    setSavingsError("");
    setSubmitting(true);
    try {
      const result = await recordSavingsCollection({
        organizationId: orgId, organizationName: organization?.name || "FundCircle",
        customerId: selectedCustomer.id, agentId: user.id, agentName, amount: num,
      });
      setReceipt({
        receiptNo: result.receiptNo,
        organizationName: organization?.name || "FundCircle",
        customerName: (selectedCustomer as any).fullName || (selectedCustomer as any).name || selectedCustomer.email || "",
        accountNumber: (savingsAccount as any)?.id?.slice(-8),
        amount: num, newBalance: result.newBalance,
        collectionType: "SAVINGS", agentName, collectedAt: new Date(),
      });
      handleClose();
      toast.success(`₹${num.toLocaleString()} collected · Receipt: ${result.receiptNo}`);
    } catch (err: any) {
      toast.error(err?.message || "Collection failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── EMI-only collection ────────────────────────────────────────────────────
  const handleCollectEMI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !activeLoan || !nextInstallment || !user?.id) return;
    const num = Number(emiAmount);
    if (!emiAmount.trim()) { setEmiError("EMI amount is required"); return; }
    if (isNaN(num) || num <= 0) { setEmiError("Amount must be greater than 0"); return; }
    setEmiError("");
    setSubmitting(true);
    try {
      const result = await recordEMICollection({
        organizationId: orgId, organizationName: organization?.name || "",
        loanId: activeLoan.id, installmentId: nextInstallment.id,
        customerId: selectedCustomer.id, agentId: user.id, agentName, amount: num,
      });
      setReceipt({
        receiptNo: result.receiptNo,
        organizationName: organization?.name || "FundCircle",
        customerName: (selectedCustomer as any).fullName || (selectedCustomer as any).name || selectedCustomer.email || "",
        amount: num,
        collectionType: "LOAN_EMI",
        loanOutstanding: result.loanClosed ? 0 : (activeLoan.outstandingBalance ?? 0) - num,
        installmentNo: nextInstallment.installmentNo,
        agentName, collectedAt: new Date(),
      });
      handleClose();
      toast.success(`EMI ₹${num.toLocaleString()} collected · Receipt: ${result.receiptNo}`);
    } catch (err: any) {
      toast.error(err?.message || "Collection failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Combined collection ────────────────────────────────────────────────────
  const handleCollectCombined = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !user?.id) return;
    const savNum = Number(savingsAmount);
    const emiNum = Number(emiAmount);
    let hasError = false;
    if (!savingsAmount.trim() || isNaN(savNum) || savNum <= 0) { setSavingsError("Enter savings amount > 0"); hasError = true; }
    if (!emiAmount.trim()     || isNaN(emiNum) || emiNum <= 0)  { setEmiError("Enter EMI amount > 0");     hasError = true; }
    if (hasError) return;
    if (!activeLoan || !nextInstallment) {
      toast.error("No active loan installment found. Contact admin.");
      return;
    }
    setSavingsError("");
    setEmiError("");
    setSubmitting(true);
    try {
      const result = await recordCombinedCollection({
        organizationId: orgId, organizationName: organization?.name || "",
        customerId: selectedCustomer.id, agentId: user.id, agentName,
        savingsAmount: savNum, loanId: activeLoan.id,
        installmentId: nextInstallment.id, emiAmount: emiNum,
      });
      setReceipt({
        receiptNo: result.receiptNo,
        organizationName: organization?.name || "FundCircle",
        customerName: (selectedCustomer as any).fullName || (selectedCustomer as any).name || selectedCustomer.email || "",
        amount: savNum + emiNum,
        savingsAmount: savNum, loanAmount: emiNum,
        newBalance: result.savingsBalance,
        loanOutstanding: result.loanOutstanding,
        collectionType: "BOTH",
        agentName, collectedAt: new Date(),
      });
      handleClose();
      toast.success(`Combined ₹${(savNum + emiNum).toLocaleString()} collected · Receipt: ${result.receiptNo}`);
    } catch (err: any) {
      toast.error(err?.message || "Collection failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const custName = selectedCustomer
    ? ((selectedCustomer as any).fullName || (selectedCustomer as any).name || selectedCustomer.email || "")
    : "";

  return (
    <div className="space-y-5">
      {/* Header KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-emerald-600 text-white shadow-md col-span-2">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Today's Collections</p>
              <p className="text-3xl font-black">₹{todayTotal.toLocaleString()}</p>
              <p className="text-emerald-200 text-xs mt-0.5">{todayCollections.length} transaction{todayCollections.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <p className="text-slate-500 text-xs font-medium mb-1">Assigned Customers</p>
            <p className="text-2xl font-black text-slate-900">{activeCustomers.length}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-400">{allMembers.length} total</span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50">
          <CardContent className="p-4">
            <p className="text-amber-700 text-xs font-medium mb-1">Pending Visits</p>
            <p className="text-2xl font-black text-amber-900">{pendingCustomers.length}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-amber-500" />
              <span className="text-xs text-amber-600">no collection today</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-emerald-600" />
            Daily Collection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer by name or phone…"
              className="pl-9 h-11"
            />
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <PiggyBank className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active customers found.</p>
              {search && <p className="text-xs mt-1">Try a different search term.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredCustomers.map((customer) => {
                const collectedToday = todayCollections.some(
                  (c) => c.customerId === customer.id || c.customerId === customer.clerkUserId
                );
                const name  = (customer as any).fullName || (customer as any).name || customer.email || "";
                const cType = getCustomerType(customer);
                return (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      collectedToday
                        ? "border-emerald-200 bg-emerald-50 opacity-70"
                        : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-slate-900 text-sm truncate">{name}</p>
                          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_BADGE[cType]}`}>
                            {TYPE_LABEL[cType]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{customer.phone || customer.email || ""}</p>
                      </div>
                      {collectedToday ? (
                        <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Done
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Transactions */}
      {todayCollections.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Today's Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...todayCollections]
                .sort((a, b) => toDate(b.collectedAt || b.timestamp).valueOf() - toDate(a.collectedAt || a.timestamp).valueOf())
                .map((col) => {
                  const cust = allMembers.find((m) => m.id === col.customerId || m.clerkUserId === col.customerId);
                  const name = (cust as any)?.fullName || (cust as any)?.name || col.customerId?.slice(-6) || "Customer";
                  const d    = toDate(col.collectedAt || col.timestamp);
                  const isSavings = col.collectionType === "SAVINGS";
                  const isBoth    = col.collectionType === "BOTH";
                  return (
                    <div key={col.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            isBoth    ? "bg-violet-100 text-violet-700"
                            : isSavings ? "bg-emerald-100 text-emerald-700"
                            : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {isBoth ? "S+L" : isSavings ? "SAVINGS" : "EMI"}
                          </span>
                          <span className="text-xs text-slate-500">{d.getTime() > 0 ? format(d, "h:mm a") : ""}</span>
                          {col.receiptNo && <span className="text-xs text-slate-400 font-mono">{col.receiptNo}</span>}
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600">+₹{Number(col.amount).toLocaleString()}</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collection Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {collectMode === "LOAN"     && <CreditCard className="w-5 h-5 text-indigo-600" />}
              {collectMode === "COMBINED" && <Layers className="w-5 h-5 text-violet-600" />}
              {(collectMode === "SAVINGS" || !collectMode) && <PiggyBank className="w-5 h-5 text-emerald-600" />}
              {collectMode === "SAVINGS"  ? "Record Savings Collection"
               : collectMode === "LOAN"  ? "Record EMI Payment"
               : collectMode === "COMBINED" ? "Combined Collection"
               : "Record Collection"}
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="mt-1 space-y-4">
              {/* Customer info card */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900">{custName}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${TYPE_BADGE[getCustomerType(selectedCustomer)]}`}>
                    {TYPE_LABEL[getCustomerType(selectedCustomer)]}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{selectedCustomer.phone || selectedCustomer.email}</p>

                {loadingDetails ? (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                    <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Loading account details…</span>
                  </div>
                ) : (
                  <>
                    {(collectMode === "SAVINGS" || collectMode === "COMBINED") && savingsAccount && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                        <span className="text-xs text-slate-500">Savings Balance</span>
                        <span className="font-bold text-emerald-600 text-sm">
                          ₹{savingsAccount.totalBalance.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {(collectMode === "SAVINGS" || collectMode === "COMBINED") && !savingsAccount && !loadingDetails && (
                      <p className="text-xs text-red-500 mt-1 pt-1 border-t border-slate-200">⚠ No active savings account found.</p>
                    )}
                    {(collectMode === "LOAN" || collectMode === "COMBINED") && activeLoan && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                        <span className="text-xs text-slate-500">Loan Outstanding</span>
                        <span className="font-bold text-indigo-600 text-sm">
                          ₹{(activeLoan.outstandingBalance ?? 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {(collectMode === "LOAN" || collectMode === "COMBINED") && !activeLoan && !loadingDetails && (
                      <p className="text-xs text-amber-600 mt-1 pt-1 border-t border-slate-200">ℹ No active loan found.</p>
                    )}
                  </>
                )}
              </div>

              {/* SAVINGS form */}
              {collectMode === "SAVINGS" && (
                <form onSubmit={handleCollectSavings} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="savings-amount">Amount to Collect (₹)</Label>
                    <Input
                      id="savings-amount" type="number" min="1"
                      placeholder="e.g. 100"
                      value={savingsAmount}
                      onChange={(e) => { setSavingsAmount(e.target.value); setSavingsError(""); }}
                      className={`text-xl h-12 font-bold ${savingsError ? "border-red-400" : ""}`}
                      autoFocus
                    />
                    <FieldError error={savingsError} />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11"
                      disabled={submitting || !savingsAccount || loadingDetails}>
                      {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Collecting…</> : "Collect & Get Receipt"}
                    </Button>
                  </div>
                </form>
              )}

              {/* LOAN EMI form */}
              {collectMode === "LOAN" && (
                <form onSubmit={handleCollectEMI} className="space-y-4">
                  {nextInstallment && (
                    <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-700">
                      <p className="font-semibold">Installment #{nextInstallment.installmentNo}</p>
                      <p className="mt-0.5">Scheduled EMI: ₹{(nextInstallment.emiAmount || 0).toLocaleString()}</p>
                    </div>
                  )}
                  {!nextInstallment && !loadingDetails && (
                    <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                      No pending installment found. All EMIs may be paid.
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="emi-amount">EMI Amount (₹)</Label>
                    <Input
                      id="emi-amount" type="number" min="1"
                      placeholder="e.g. 5000"
                      value={emiAmount}
                      onChange={(e) => { setEmiAmount(e.target.value); setEmiError(""); }}
                      className={`text-xl h-12 font-bold ${emiError ? "border-red-400" : ""}`}
                      autoFocus
                    />
                    <FieldError error={emiError} />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-11"
                      disabled={submitting || !activeLoan || !nextInstallment || loadingDetails}>
                      {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Collecting…</> : "Collect EMI & Receipt"}
                    </Button>
                  </div>
                </form>
              )}

              {/* COMBINED form */}
              {collectMode === "COMBINED" && (
                <form onSubmit={handleCollectCombined} className="space-y-4">
                  {nextInstallment && (
                    <div className="bg-violet-50 rounded-xl p-3 text-xs text-violet-700">
                      <p className="font-semibold">Installment #{nextInstallment.installmentNo} · EMI: ₹{(nextInstallment.emiAmount || 0).toLocaleString()}</p>
                      <p className="mt-0.5 text-violet-500">One receipt covers both savings + EMI.</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="combined-savings">Savings Deposit (₹)</Label>
                    <Input
                      id="combined-savings" type="number" min="1"
                      placeholder="e.g. 100"
                      value={savingsAmount}
                      onChange={(e) => { setSavingsAmount(e.target.value); setSavingsError(""); }}
                      className={`h-11 font-semibold ${savingsError ? "border-red-400" : ""}`}
                      autoFocus
                    />
                    <FieldError error={savingsError} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="combined-emi">EMI Amount (₹)</Label>
                    <Input
                      id="combined-emi" type="number" min="1"
                      placeholder="e.g. 5000"
                      value={emiAmount}
                      onChange={(e) => { setEmiAmount(e.target.value); setEmiError(""); }}
                      className={`h-11 font-semibold ${emiError ? "border-red-400" : ""}`}
                    />
                    <FieldError error={emiError} />
                  </div>
                  {savingsAmount && emiAmount && Number(savingsAmount) > 0 && Number(emiAmount) > 0 && (
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                      <span className="text-sm text-slate-500">Total to collect</span>
                      <span className="text-lg font-black text-emerald-600">
                        ₹{(Number(savingsAmount) + Number(emiAmount)).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 h-11"
                      disabled={submitting || loadingDetails || !activeLoan || !nextInstallment || !savingsAccount}>
                      {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Collecting…</> : "Collect Both & Receipt"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
