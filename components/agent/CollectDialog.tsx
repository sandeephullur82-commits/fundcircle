import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreditCard, Banknote, Loader2 } from "lucide-react";
import { Loan, LoanInstallment } from "@/types";
import {
  recordGeneralCollection,
  recordEMICollection,
  getActiveLoanForCustomer,
  getNextPendingInstallment,
} from "@/lib/services";
import ReceiptModal, { ReceiptData } from "@/components/ReceiptModal";
import FieldError from "@/components/ui/FieldError";

type PaymentMode = "CASH" | "UPI" | "BANK_TRANSFER";

type CollectMode = "LOAN_EMI" | "GENERAL" | null;

export function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

interface CollectDialogProps {
  customer: any | null;
  orgId: string;
  orgName: string;
  agentId: string;
  agentName: string;
  onClose: () => void;
  collectedByRole?: string;
  collectedById?: string;
}

export default function CollectDialog({
  customer, orgId, orgName, agentId, agentName, onClose,
  collectedByRole, collectedById,
}: CollectDialogProps) {
  const [collectMode,     setCollectMode]     = useState<CollectMode>(null);
  const [activeLoan,      setActiveLoan]      = useState<Loan | null>(null);
  const [nextInstallment, setNextInstallment] = useState<LoanInstallment | null>(null);
  const [loadingDetails,  setLoadingDetails]  = useState(false);
  const [amount,          setAmount]          = useState("");
  const [amountError,     setAmountError]     = useState("");
  const [paymentMode,     setPaymentMode]     = useState<PaymentMode>("CASH");
  const [notes,           setNotes]           = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [receipt,         setReceipt]         = useState<ReceiptData | null>(null);

  useEffect(() => {
    if (!customer) {
      setCollectMode(null);
      setAmount("");
      setAmountError("");
      setActiveLoan(null);
      setNextInstallment(null);
      return;
    }
    setLoadingDetails(true);
    setAmount("");
    setAmountError("");
    setPaymentMode("CASH");
    setNotes("");
    setActiveLoan(null);
    setNextInstallment(null);

    (async () => {
      try {
        const loan = await getActiveLoanForCustomer(customer.id, orgId);
        setActiveLoan(loan);
        if (loan) {
          const inst = await getNextPendingInstallment(loan.id);
          setNextInstallment(inst);
          if (inst) setAmount(String(inst.emiAmount || ""));
          setCollectMode("LOAN_EMI");
        } else {
          setCollectMode("GENERAL");
        }
      } catch {
        toast.error("Failed to load account details.");
        setCollectMode("GENERAL");
      } finally {
        setLoadingDetails(false);
      }
    })();
  }, [customer?.id]);

  const custName = customer ? (customer.fullName || customer.name || customer.email || "") : "";

  const handleCollectEMI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !activeLoan || !nextInstallment || !agentId) return;
    const num = Number(amount);
    if (!amount.trim())         { setAmountError("EMI amount is required"); return; }
    if (isNaN(num) || num <= 0) { setAmountError("Amount must be greater than 0"); return; }
    setAmountError("");
    setSubmitting(true);
    try {
      const result = await recordEMICollection({
        organizationId: orgId, organizationName: orgName,
        loanId: activeLoan.id, installmentId: nextInstallment.id,
        customerId: customer.id, agentId, agentName, amount: num,
        ...(collectedByRole ? { collectedByRole } : {}),
        ...(collectedById   ? { collectedById   } : {}),
      });
      setReceipt({
        receiptNo: result.receiptNo, organizationName: orgName,
        customerName: custName, amount: num, collectionType: "LOAN_EMI",
        loanOutstanding: result.loanClosed ? 0 : (activeLoan.outstandingBalance ?? 0) - num,
        installmentNo: nextInstallment.installmentNo, agentName, collectedAt: new Date(),
      });
      onClose();
      toast.success(`EMI ₹${num.toLocaleString()} collected · ${result.receiptNo}`);
    } catch (err: any) {
      toast.error(err?.message || "Collection failed.");
    } finally { setSubmitting(false); }
  };

  const handleCollectGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !agentId) return;
    const num = Number(amount);
    if (!amount.trim())         { setAmountError("Amount is required"); return; }
    if (isNaN(num) || num <= 0) { setAmountError("Amount must be greater than 0"); return; }
    if (num > 1_000_000)        { setAmountError("Amount cannot exceed ₹10,00,000"); return; }
    setAmountError("");
    setSubmitting(true);
    try {
      const result = await recordGeneralCollection({
        organizationId: orgId, organizationName: orgName,
        customerId: customer.id, agentId, agentName, amount: num,
        paymentMode, notes: notes.trim() || undefined,
        ...(collectedByRole ? { collectedByRole } : {}),
        ...(collectedById   ? { collectedById   } : {}),
      });
      setReceipt({
        receiptNo: result.receiptNo, organizationName: orgName,
        customerName: custName, amount: num,
        collectionType: "SAVINGS", agentName, collectedAt: new Date(),
      });
      onClose();
      toast.success(`₹${num.toLocaleString()} collected · ${result.receiptNo}`);
    } catch (err: any) {
      toast.error(err?.message || "Collection failed.");
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {collectMode === "LOAN_EMI"
                ? <CreditCard className="w-5 h-5 text-indigo-600" />
                : <Banknote className="w-5 h-5 text-emerald-600" />}
              {collectMode === "LOAN_EMI" ? "Record EMI Payment" : "Record Collection"}
            </DialogTitle>
          </DialogHeader>

          {customer && (
            <div className="mt-1 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-1">
                <p className="font-bold text-slate-900">{custName}</p>
                <p className="text-xs text-slate-500">{customer.phone || customer.email}</p>

                {loadingDetails ? (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                    <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Loading account details…</span>
                  </div>
                ) : (
                  <>
                    {collectMode === "LOAN_EMI" && activeLoan && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                        <span className="text-xs text-slate-500">Loan Outstanding</span>
                        <span className="font-bold text-indigo-600 text-sm">₹{(activeLoan.outstandingBalance ?? 0).toLocaleString()}</span>
                      </div>
                    )}
                    {collectMode === "LOAN_EMI" && !activeLoan && (
                      <p className="text-xs text-amber-600 mt-1 pt-1 border-t border-slate-200">ℹ No active loan found.</p>
                    )}
                    {collectMode === "GENERAL" && (
                      <p className="text-xs text-emerald-600 mt-1 pt-1 border-t border-slate-200">General collection (no active loan)</p>
                    )}
                  </>
                )}
              </div>

              {/* Mode toggle */}
              {!loadingDetails && (
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setCollectMode("LOAN_EMI");
                      if (nextInstallment) setAmount(String(nextInstallment.emiAmount || ""));
                      else setAmount("");
                      setAmountError("");
                    }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${collectMode === "LOAN_EMI" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                  >
                    EMI Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCollectMode("GENERAL"); setAmount(""); setAmountError(""); }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${collectMode === "GENERAL" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                  >
                    General
                  </button>
                </div>
              )}

              {collectMode === "LOAN_EMI" && (
                <form onSubmit={handleCollectEMI} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-emi-amt">EMI Amount (₹)</Label>
                    <Input id="cd-emi-amt" type="number" min="1" placeholder="EMI amount"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
                      className={`text-xl h-12 font-bold ${amountError ? "border-red-400" : ""}`}
                      autoFocus disabled={submitting}
                    />
                    <FieldError error={amountError} />
                    {nextInstallment && (
                      <p className="text-xs text-indigo-600">
                        Installment #{nextInstallment.installmentNo} · Due ₹{Number(nextInstallment.emiAmount).toLocaleString()}
                      </p>
                    )}
                    {!nextInstallment && !loadingDetails && activeLoan && (
                      <p className="text-xs text-amber-600">No pending installment found.</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-11"
                      disabled={submitting || loadingDetails || !nextInstallment}>
                      {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : "Collect EMI"}
                    </Button>
                  </div>
                </form>
              )}

              {collectMode === "GENERAL" && (
                <form onSubmit={handleCollectGeneral} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-gen-amt">Amount to Collect (₹)</Label>
                    <Input id="cd-gen-amt" type="number" min="1" placeholder="e.g. 100"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
                      className={`text-xl h-12 font-bold ${amountError ? "border-red-400" : ""}`}
                      autoFocus disabled={submitting}
                    />
                    <FieldError error={amountError} />
                  </div>
                  {/* Payment Mode */}
                  <div className="space-y-1.5">
                    <Label>Payment Mode</Label>
                    <div className="flex gap-1.5">
                      {(["CASH", "UPI", "BANK_TRANSFER"] as PaymentMode[]).map((m) => (
                        <button key={m} type="button"
                          onClick={() => setPaymentMode(m)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                            paymentMode === m
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-emerald-400"
                          }`}
                        >
                          {m === "BANK_TRANSFER" ? "Bank" : m}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-gen-notes">Notes <span className="text-slate-400 font-normal text-xs">(optional)</span></Label>
                    <Input id="cd-gen-notes" type="text" placeholder="e.g. advance, late fee…"
                      value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                      className="h-9 text-sm" disabled={submitting}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11"
                      disabled={submitting || loadingDetails}>
                      {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : "Collect"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
