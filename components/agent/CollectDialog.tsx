import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CreditCard, Banknote, Loader2, AlertTriangle, CheckCircle2,
  TrendingDown, ZapOff, ChevronRight,
} from "lucide-react";
import { Loan, LoanInstallment } from "@/types";
import {
  recordGeneralCollection,
  recordEMICollection,
  recordPartialPayment,
  recordAdvancePayment,
  recordForeclosure,
  getActiveLoanForCustomer,
  getNextPendingInstallment,
} from "@/lib/services";
import ReceiptModal, { ReceiptData } from "@/components/ReceiptModal";
import FieldError from "@/components/ui/FieldError";

type PaymentMode   = "CASH" | "UPI" | "BANK_TRANSFER";
type CollectMode   = "LOAN_EMI" | "GENERAL" | null;
type RepaymentType = "REGULAR" | "PARTIAL" | "ADVANCE" | "FORECLOSURE";

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

const REPAYMENT_TYPES: { id: RepaymentType; label: string; sublabel: string; icon: React.ElementType; color: string }[] = [
  { id: "REGULAR",     label: "Regular EMI",     sublabel: "Pay monthly EMI",       icon: CheckCircle2,  color: "indigo"  },
  { id: "PARTIAL",     label: "Partial",          sublabel: "Pay less than EMI",     icon: TrendingDown,  color: "amber"   },
  { id: "ADVANCE",     label: "Advance",          sublabel: "Pay multiple EMIs",     icon: CreditCard,    color: "emerald" },
  { id: "FORECLOSURE", label: "Foreclosure",      sublabel: "Pay full outstanding",  icon: ZapOff,        color: "rose"    },
];

const COLOR_MAP: Record<string, { active: string; ring: string; text: string }> = {
  indigo:  { active: "bg-indigo-600 text-white border-indigo-600",   ring: "ring-indigo-300",  text: "text-indigo-700"  },
  amber:   { active: "bg-amber-500 text-white border-amber-500",     ring: "ring-amber-300",   text: "text-amber-700"   },
  emerald: { active: "bg-emerald-600 text-white border-emerald-600", ring: "ring-emerald-300", text: "text-emerald-700" },
  rose:    { active: "bg-rose-600 text-white border-rose-600",       ring: "ring-rose-300",    text: "text-rose-700"    },
};

export default function CollectDialog({
  customer, orgId, orgName, agentId, agentName, onClose,
  collectedByRole, collectedById,
}: CollectDialogProps) {
  const [collectMode,     setCollectMode]     = useState<CollectMode>(null);
  const [activeLoan,      setActiveLoan]      = useState<Loan | null>(null);
  const [nextInstallment, setNextInstallment] = useState<LoanInstallment | null>(null);
  const [loadingDetails,  setLoadingDetails]  = useState(false);
  const [repaymentType,   setRepaymentType]   = useState<RepaymentType>("REGULAR");
  const [amount,          setAmount]          = useState("");
  const [amountError,     setAmountError]     = useState("");
  const [paymentMode,     setPaymentMode]     = useState<PaymentMode>("CASH");
  const [notes,           setNotes]           = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [receipt,         setReceipt]         = useState<ReceiptData | null>(null);

  useEffect(() => {
    if (!customer) {
      setCollectMode(null); setAmount(""); setAmountError("");
      setActiveLoan(null); setNextInstallment(null);
      return;
    }
    setLoadingDetails(true);
    setAmount(""); setAmountError(""); setPaymentMode("CASH");
    setNotes(""); setActiveLoan(null); setNextInstallment(null);
    setRepaymentType("REGULAR");

    (async () => {
      try {
        const loan = await getActiveLoanForCustomer(customer.id, orgId);
        // Filter out closed loans
        if (loan && (loan.status === "CLOSED" || (loan.outstandingBalance ?? 0) <= 0)) {
          setActiveLoan(null);
          setCollectMode("GENERAL");
        } else if (loan) {
          setActiveLoan(loan);
          const inst = await getNextPendingInstallment(loan.id);
          setNextInstallment(inst);
          if (inst) setAmount(String(Math.round(inst.emiAmount || 0)));
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

  // When repayment type changes, pre-fill amount accordingly
  useEffect(() => {
    if (!activeLoan) return;
    if (repaymentType === "REGULAR" && nextInstallment) {
      setAmount(String(Math.round(nextInstallment.emiAmount || 0)));
    } else if (repaymentType === "FORECLOSURE") {
      setAmount(String(Math.round((activeLoan.outstandingBalance ?? 0) * 100) / 100));
    } else if (repaymentType === "ADVANCE") {
      setAmount("");
    } else if (repaymentType === "PARTIAL") {
      setAmount("");
    }
    setAmountError("");
  }, [repaymentType]);

  // Live advance payment preview
  const advancePreview = useMemo(() => {
    if (repaymentType !== "ADVANCE" || !nextInstallment || !amount) return null;
    const num = Number(amount);
    if (!num || num <= 0) return null;
    const emi = nextInstallment.emiAmount ?? 0;
    if (emi <= 0) return null;
    const fullEMIs = Math.floor(num / emi);
    const partial  = num - fullEMIs * emi;
    return { fullEMIs, partial: Math.round(partial * 100) / 100 };
  }, [repaymentType, amount, nextInstallment]);

  const outstanding = activeLoan ? (activeLoan.outstandingBalance ?? 0) : 0;
  const custName    = customer ? (customer.fullName || customer.name || customer.email || "") : "";

  const validateAmount = (num: number): string | null => {
    if (!num || isNaN(num) || num <= 0) return "Amount must be greater than ₹0";
    if (num > outstanding + 0.05) return `Collection exceeds outstanding balance of ₹${outstanding.toLocaleString("en-IN")}`;
    if (repaymentType === "PARTIAL" && nextInstallment) {
      const emi = nextInstallment.emiAmount ?? 0;
      if (num >= emi - 0.05) return `For partial payment enter less than EMI amount (₹${Math.round(emi).toLocaleString("en-IN")})`;
    }
    return null;
  };

  const handleCollectEMI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !activeLoan || !agentId) return;

    if (repaymentType === "FORECLOSURE") {
      await handleForeclosure();
      return;
    }

    const num = Number(amount);
    const err = validateAmount(num);
    if (err) { setAmountError(err); return; }
    if (repaymentType !== "ADVANCE" && !nextInstallment) {
      setAmountError("No pending installment found"); return;
    }
    setAmountError("");
    setSubmitting(true);

    try {
      const collectorInfo = {
        organizationId: orgId, organizationName: orgName,
        loanId: activeLoan.id, customerId: customer.id,
        agentId, agentName,
        paymentMode,
        ...(collectedByRole ? { collectedByRole } : {}),
        ...(collectedById   ? { collectedById   } : {}),
      };

      if (repaymentType === "REGULAR") {
        if (!nextInstallment) return;
        const result = await recordEMICollection({
          ...collectorInfo,
          installmentId: nextInstallment.id,
          amount: num,
        });
        setReceipt({
          receiptNo: result.receiptNo, organizationName: orgName,
          customerName: custName, amount: num,
          collectionType: "LOAN_EMI", repaymentType: "REGULAR",
          loanOutstanding: result.loanClosed ? 0 : Math.max(0, outstanding - num),
          installmentNo: nextInstallment.installmentNo, agentName, collectedAt: new Date(),
        });
        onClose();
        toast.success(`EMI ₹${num.toLocaleString("en-IN")} collected · ${result.receiptNo}`);

      } else if (repaymentType === "PARTIAL") {
        if (!nextInstallment) return;
        const result = await recordPartialPayment({
          ...collectorInfo,
          installmentId: nextInstallment.id,
          amount: num,
        });
        setReceipt({
          receiptNo: result.receiptNo, organizationName: orgName,
          customerName: custName, amount: num,
          collectionType: "LOAN_EMI", repaymentType: "PARTIAL",
          loanOutstanding: result.loanClosed ? 0 : Math.max(0, outstanding - num),
          installmentNo: nextInstallment.installmentNo, agentName, collectedAt: new Date(),
        });
        onClose();
        toast.success(`Partial ₹${num.toLocaleString("en-IN")} collected · ${result.receiptNo}`);

      } else if (repaymentType === "ADVANCE") {
        const result = await recordAdvancePayment({
          ...collectorInfo,
          amount: num,
        });
        setReceipt({
          receiptNo: result.receiptNo, organizationName: orgName,
          customerName: custName, amount: num,
          collectionType: "LOAN_EMI", repaymentType: "ADVANCE",
          loanOutstanding: result.loanClosed ? 0 : Math.max(0, outstanding - num),
          emisCleared: result.emisCleared, agentName, collectedAt: new Date(),
        });
        onClose();
        toast.success(`Advance ₹${num.toLocaleString("en-IN")} · ${result.emisCleared} EMI${result.emisCleared !== 1 ? "s" : ""} cleared · ${result.receiptNo}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Collection failed.");
    } finally { setSubmitting(false); }
  };

  const handleForeclosure = async () => {
    if (!activeLoan || !customer || !agentId) return;
    setSubmitting(true);
    try {
      const result = await recordForeclosure({
        organizationId: orgId, organizationName: orgName,
        loanId: activeLoan.id, customerId: customer.id,
        agentId, agentName, paymentMode,
        ...(collectedByRole ? { collectedByRole } : {}),
        ...(collectedById   ? { collectedById   } : {}),
      });
      setReceipt({
        receiptNo: result.receiptNo, organizationName: orgName,
        customerName: custName, amount: result.amountPaid,
        collectionType: "LOAN_EMI", repaymentType: "FORECLOSURE",
        loanOutstanding: 0, agentName, collectedAt: new Date(),
      });
      onClose();
      toast.success(`Loan foreclosed · ₹${result.amountPaid.toLocaleString("en-IN")} settled · ${result.receiptNo}`);
    } catch (err: any) {
      toast.error(err?.message || "Foreclosure failed.");
    } finally { setSubmitting(false); }
  };

  const handleCollectGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !agentId) return;
    const num = Number(amount);
    if (!amount.trim())         { setAmountError("Amount is required"); return; }
    if (isNaN(num) || num <= 0) { setAmountError("Amount must be greater than ₹0"); return; }
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
      toast.success(`₹${num.toLocaleString("en-IN")} collected · ${result.receiptNo}`);
    } catch (err: any) {
      toast.error(err?.message || "Collection failed.");
    } finally { setSubmitting(false); }
  };

  const submitBtnColor = {
    REGULAR:     "bg-indigo-600 hover:bg-indigo-700",
    PARTIAL:     "bg-amber-500 hover:bg-amber-600",
    ADVANCE:     "bg-emerald-600 hover:bg-emerald-700",
    FORECLOSURE: "bg-rose-600 hover:bg-rose-700",
  }[repaymentType] || "bg-indigo-600 hover:bg-indigo-700";

  const submitLabel = {
    REGULAR:     "Collect EMI",
    PARTIAL:     "Record Partial Payment",
    ADVANCE:     "Record Advance Payment",
    FORECLOSURE: "Confirm Foreclosure",
  }[repaymentType] || "Collect";

  return (
    <>
      <Dialog open={!!customer} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
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
              {/* Customer info card */}
              <div className="bg-slate-50 rounded-xl p-3.5 space-y-1">
                <p className="font-bold text-slate-900 text-sm">{custName}</p>
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
                        <span className="text-xs text-slate-500">Outstanding Balance</span>
                        <span className="font-bold text-indigo-600 text-sm">₹{outstanding.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {collectMode === "LOAN_EMI" && nextInstallment && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">EMI #{nextInstallment.installmentNo}</span>
                        <span className="text-xs font-semibold text-slate-700">
                          ₹{Math.round(nextInstallment.emiAmount || 0).toLocaleString("en-IN")}/mo
                        </span>
                      </div>
                    )}
                    {collectMode === "GENERAL" && (
                      <p className="text-xs text-emerald-600 mt-1 pt-1 border-t border-slate-200">General collection</p>
                    )}
                  </>
                )}
              </div>

              {/* ── LOAN EMI FORM ── */}
              {collectMode === "LOAN_EMI" && activeLoan && !loadingDetails && (
                <form onSubmit={handleCollectEMI} className="space-y-4">
                  {/* Repayment type selector */}
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-500 uppercase tracking-wide">Repayment Type</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {REPAYMENT_TYPES.map((rt) => {
                        const Icon = rt.icon;
                        const isActive = repaymentType === rt.id;
                        const colors = COLOR_MAP[rt.color];
                        return (
                          <button
                            key={rt.id}
                            type="button"
                            onClick={() => { setRepaymentType(rt.id); setAmountError(""); }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all text-xs font-semibold ${
                              isActive
                                ? `${colors.active} shadow-sm`
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="leading-tight">{rt.label}</p>
                              <p className={`text-[10px] font-normal leading-tight ${isActive ? "opacity-80" : "text-slate-400"}`}>
                                {rt.sublabel}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Foreclosure confirmation box */}
                  {repaymentType === "FORECLOSURE" ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-rose-800">Loan Foreclosure</p>
                          <p className="text-xs text-rose-600 mt-0.5">This will settle the entire outstanding balance and close the loan immediately.</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg px-4 py-3 flex justify-between items-center border border-rose-100">
                        <span className="text-sm text-slate-600">Settlement Amount</span>
                        <span className="text-lg font-black text-rose-700">₹{outstanding.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  ) : (
                    /* Amount input */
                    <div className="space-y-1.5">
                      <Label htmlFor="cd-emi-amt">
                        {repaymentType === "REGULAR"  && "EMI Amount (₹)"}
                        {repaymentType === "PARTIAL"  && "Partial Amount (₹)"}
                        {repaymentType === "ADVANCE"  && "Advance Amount (₹)"}
                      </Label>
                      <Input
                        id="cd-emi-amt"
                        type="number" inputMode="decimal" min="1"
                        placeholder={
                          repaymentType === "REGULAR"  ? `e.g. ${Math.round(nextInstallment?.emiAmount || 0)}` :
                          repaymentType === "PARTIAL"  ? `Less than ₹${Math.round(nextInstallment?.emiAmount || 0)}` :
                          `e.g. ${Math.round((nextInstallment?.emiAmount || 0) * 3)}`
                        }
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value.replace(/[^0-9.]/g, ""));
                          setAmountError("");
                        }}
                        className={`text-xl h-12 font-bold ${amountError ? "border-red-400" : ""}`}
                        autoFocus disabled={submitting}
                        readOnly={repaymentType === "FORECLOSURE"}
                      />
                      <FieldError error={amountError} />

                      {/* Advance preview */}
                      {repaymentType === "ADVANCE" && advancePreview && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-2">
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <p className="text-xs text-emerald-700 font-semibold">
                            Clears <strong>{advancePreview.fullEMIs}</strong> EMI{advancePreview.fullEMIs !== 1 ? "s" : ""}
                            {advancePreview.partial > 0 && ` + partial ₹${advancePreview.partial.toLocaleString("en-IN")}`}
                          </p>
                        </div>
                      )}

                      {/* Partial hint */}
                      {repaymentType === "PARTIAL" && nextInstallment && (
                        <p className="text-xs text-amber-600">
                          Enter any amount less than EMI (₹{Math.round(nextInstallment.emiAmount || 0).toLocaleString("en-IN")}). Installment will be marked PARTIAL.
                        </p>
                      )}

                      {/* Outstanding guard */}
                      {repaymentType === "ADVANCE" && Number(amount) > outstanding && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Exceeds outstanding balance of ₹{outstanding.toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Payment Mode */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Payment Mode</Label>
                    <div className="flex gap-1.5">
                      {(["CASH", "UPI", "BANK_TRANSFER"] as PaymentMode[]).map((m) => (
                        <button key={m} type="button" onClick={() => setPaymentMode(m)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                            paymentMode === m
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          {m === "BANK_TRANSFER" ? "Bank" : m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className={`flex-1 h-11 text-white ${submitBtnColor}`}
                      disabled={submitting || loadingDetails || (repaymentType !== "FORECLOSURE" && !nextInstallment && repaymentType !== "ADVANCE")}
                    >
                      {submitting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
                        : submitLabel}
                    </Button>
                  </div>
                </form>
              )}

              {/* No active loan in EMI mode */}
              {collectMode === "LOAN_EMI" && !activeLoan && !loadingDetails && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-3 border border-amber-100">
                  ℹ No active loan found for this customer.
                </p>
              )}

              {/* ── GENERAL COLLECTION FORM ── */}
              {collectMode === "GENERAL" && (
                <form onSubmit={handleCollectGeneral} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="cd-gen-amt">Amount to Collect (₹)</Label>
                    <Input id="cd-gen-amt" type="number" inputMode="decimal" min="1" placeholder="e.g. 100"
                      value={amount}
                      onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
                      className={`text-xl h-12 font-bold ${amountError ? "border-red-400" : ""}`}
                      autoFocus disabled={submitting}
                    />
                    <FieldError error={amountError} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Payment Mode</Label>
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

                  <div className="space-y-1.5">
                    <Label htmlFor="cd-gen-notes">
                      Notes <span className="text-slate-400 font-normal text-xs">(optional)</span>
                    </Label>
                    <Input id="cd-gen-notes" type="text" placeholder="e.g. advance, late fee…"
                      value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                      className="h-9 text-sm" disabled={submitting}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
                      Cancel
                    </Button>
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
