import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fcToast } from "@/lib/toast";
import {
  CheckCircle, Loader2, AlertTriangle, ChevronDown,
  Crown, Shield, UserCheck, FileText, TrendingUp,
  XCircle, RefreshCw,
} from "lucide-react";
import { calculateEMI, approveLoan, createLoan, createAuditLog } from "@/lib/services";
import { checkLoanEligibility, EligibilityResult } from "@/lib/loanEligibility";
import { Loan, LoanApplication, Membership } from "@/types";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import FieldError from "@/components/ui/FieldError";
import SearchSelect from "@/components/ui/SearchSelect";
import { validateAmount, validateRate, sanitizeMultiline } from "@/lib/validation";

type DisbursementMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";

const CHECKLIST_ITEMS = [
  { id: "identity",   label: "Identity documents verified (Aadhaar/PAN)" },
  { id: "income",     label: "Income proof / bank statement reviewed" },
  { id: "nominee",    label: "Nominee details confirmed" },
  { id: "purpose",    label: "Loan purpose valid and documented" },
  { id: "repayment",  label: "Repayment capacity assessed" },
];

function toInputDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function generateLoanAccountNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `FC-LOAN-${datePart}-${rand}`;
}

interface Props {
  loan: Loan | null;
  application: LoanApplication | null;
  members: Membership[];
  collectors: Membership[];
  actorId: string;
  actorName: string;
  organizationId: string;
  onClose: () => void;
}

export default function LoanApprovalDialog({
  loan, application, members, collectors, actorId, actorName, organizationId, onClose,
}: Props) {
  const isOpen = !!(loan || application);
  const isApplicationMode = !loan && !!application;

  const customerId = loan?.customerId ?? application?.customerId ?? "";
  const customer = members.find((m) => m.id === customerId || m.clerkUserId === customerId);
  const custName =
    (customer as any)?.fullName || (customer as any)?.name ||
    application?.customerName || customerId.slice(-8);

  const requestedAmount = loan?.principalAmount ?? (loan as any)?.principal ?? application?.loanAmount ?? 0;
  const requestedTenure = loan?.tenureMonths ?? (loan as any)?.durationMonths ?? application?.tenureMonths ?? 12;

  const defaultDisbDate = toInputDate(new Date());
  const defaultFirstEmi = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return toInputDate(d); })();

  const [approvedAmount, setApprovedAmount] = useState(String(requestedAmount));
  const [interestRate, setInterestRate]     = useState(String(loan?.interestRate ?? (application as any)?.interestRate ?? 12));
  const [disbursementDate, setDisbursementDate] = useState(defaultDisbDate);
  const [firstEmiDate, setFirstEmiDate]     = useState(defaultFirstEmi);
  const [disbursementMethod, setDisbursementMethod] = useState<DisbursementMethod>("CASH");
  const [collectorId, setCollectorId]       = useState("");
  const [approvalNotes, setApprovalNotes]   = useState("");
  const [checklist, setChecklist]           = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors]       = useState<Record<string, string>>({});
  const [processing, setProcessing]         = useState(false);

  // Disbursement reference fields
  const [upiId, setUpiId]         = useState("");
  const [bankAccNo, setBankAccNo] = useState("");
  const [bankIfsc, setBankIfsc]   = useState("");
  const [chequeNo, setChequeNo]   = useState("");

  // Eligibility
  const [eligibility, setEligibility]   = useState<EligibilityResult | null>(null);
  const [eligLoading, setEligLoading]   = useState(false);

  const loadEligibility = useCallback(async () => {
    if (!customerId || !organizationId) return;
    setEligLoading(true);
    try {
      const result = await checkLoanEligibility({
        customerId,
        organizationId,
        customerCreatedAt: (customer as any)?.createdAt,
        minAccountAgeMonths: 1,
        minSavingsBalance: 0,
      });
      setEligibility(result);
    } catch {
      setEligibility(null);
    } finally {
      setEligLoading(false);
    }
  }, [customerId, organizationId]);

  // Reset + load eligibility when dialog opens
  useEffect(() => {
    if (!isOpen) {
      setEligibility(null);
      setFieldErrors({});
      setChecklist({});
      return;
    }
    const amt = loan?.principalAmount ?? (loan as any)?.principal ?? application?.loanAmount ?? 0;
    const rate = loan?.interestRate ?? (application as any)?.interestRate ?? 12;
    setApprovedAmount(String(amt));
    setInterestRate(String(rate));
    setDisbursementDate(toInputDate(new Date()));
    const fe = new Date(); fe.setMonth(fe.getMonth() + 1);
    setFirstEmiDate(toInputDate(fe));
    setDisbursementMethod("CASH");
    setUpiId(""); setBankAccNo(""); setBankIfsc(""); setChequeNo("");
    setApprovalNotes(loan?.approvalNotes || "");
    setChecklist({});
    setFieldErrors({});

    // Set collector
    if (loan?.loanAssignedCollectorId) {
      const found = collectors.find((c) => c.id === loan.loanAssignedCollectorId || (c as any).clerkUserId === loan.loanAssignedCollectorId);
      setCollectorId(found?.id || "");
    } else {
      const agentId = (customer as any)?.assignedAgentId || "";
      const found = collectors.find((c) => c.id === agentId || (c as any).clerkUserId === agentId);
      if (found) setCollectorId(found.id);
      else if (collectors.length === 1) setCollectorId(collectors[0].id);
      else setCollectorId("");
    }

    loadEligibility();
  }, [isOpen, loan?.id, application?.id]);

  const approvedAmountNum = parseFloat(approvedAmount) || 0;
  const interestRateNum   = parseFloat(interestRate) || 0;
  const liveEMI           = approvedAmountNum > 0 && requestedTenure > 0
    ? calculateEMI(approvedAmountNum, interestRateNum, requestedTenure)
    : 0;
  const totalRepayment = liveEMI * requestedTenure;
  const totalInterest  = totalRepayment - approvedAmountNum;

  const isOwnerMember = (m: any) => (m?.role || "").toUpperCase() === "OWNER";
  const collectorLabel = (c: any) => {
    const name = c.fullName || c.name || c.email || c.id;
    return isOwnerMember(c) ? `${name} (Owner)` : name;
  };
  const collectorOptions = collectors.map((c) => ({
    value: c.id,
    label: collectorLabel(c),
    sublabel: c.email || "",
    badge: isOwnerMember(c) ? "Owner" : undefined,
  }));

  const buildDisbRef = (): string => {
    if (disbursementMethod === "UPI")           return upiId;
    if (disbursementMethod === "BANK_TRANSFER")  return [bankAccNo, bankIfsc].filter(Boolean).join(" | ");
    if (disbursementMethod === "CHEQUE")         return chequeNo;
    return "";
  };

  const handleApprove = async () => {
    if (eligibility && !eligibility.eligible) {
      toast.error("Eligibility Check Failed", {
        description: eligibility.blockers.join("; "),
      });
      return;
    }

    const errors: Record<string, string> = {};
    const amtRes = validateAmount(approvedAmount, { label: "Approved amount", min: 1000, max: 10_000_000 });
    if (!amtRes.valid) errors.approvedAmount = amtRes.error!;
    const rateRes = validateRate(interestRate, { label: "Interest rate", max: 60 });
    if (!rateRes.valid) errors.interestRate = rateRes.error!;
    if (disbursementMethod === "UPI" && !upiId.trim()) errors.disbRef = "UPI ID is required.";
    if (disbursementMethod === "BANK_TRANSFER" && !bankAccNo.trim()) errors.disbRef = "Account number is required.";
    if (disbursementMethod === "BANK_TRANSFER" && !bankIfsc.trim()) errors.disbRef2 = "IFSC code is required.";
    if (disbursementMethod === "CHEQUE" && !chequeNo.trim()) errors.disbRef = "Cheque number is required.";

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      fcToast.formError();
      return;
    }
    setFieldErrors({});

    const collector = collectors.find((c) => c.id === collectorId);
    const loanAccountNum = generateLoanAccountNumber();
    const disbDate = disbursementDate ? new Date(disbursementDate) : new Date();
    const fEmiDate = firstEmiDate ? new Date(firstEmiDate) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; })();
    const collectorParams = {
      loanAssignedCollectorId:   (collector as any)?.clerkUserId || collector?.id || collectorId || "",
      loanAssignedCollectorName: collector ? ((collector.fullName || (collector as any).name) ?? "") : "",
      loanAssignedCollectorRole: collector ? ((collector.role as string) || "AGENT") : "",
    };
    const completedItems = CHECKLIST_ITEMS.filter((i) => checklist[i.id]).map((i) => i.label);

    setProcessing(true);
    try {
      let finalLoanId: string;

      if (isApplicationMode && application) {
        finalLoanId = await createLoan({
          organizationId: application.organizationId,
          customerId: application.customerId,
          principalAmount: approvedAmountNum,
          interestRate: interestRateNum,
          tenureMonths: application.tenureMonths,
          createdByActorId: actorId,
          createdByActorRole: "OWNER",
          createdByActorName: actorName,
          ...collectorParams,
        });
      } else {
        finalLoanId = loan!.id;
      }

      await approveLoan({
        loanId: finalLoanId,
        actorId, actorRole: "OWNER", actorName,
        approvedAmount: approvedAmountNum,
        firstEmiDate: fEmiDate,
        disbursementDate: disbDate,
        loanAccountNumber: loanAccountNum,
        approvalChecklist: completedItems,
        approvalNotes,
        disbursementMethod,
        disbursementReference: buildDisbRef(),
        ...collectorParams,
      });

      if (isApplicationMode && application) {
        await updateDoc(doc(db, "loanApplications", application.id), {
          status: "APPROVED",
          loanId: finalLoanId,
          reviewedByActorId: actorId,
          reviewedByActorName: actorName,
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Notify customer
      try {
        await addDoc(collection(db, "notifications"), {
          userId: customerId,
          organizationId,
          type: "LOAN_APPROVED",
          title: "Loan Approved! 🎉",
          message: `Your loan of ₹${approvedAmountNum.toLocaleString()} has been approved. EMI of ₹${Math.round(liveEMI).toLocaleString()}/month starts on ${fEmiDate.toLocaleDateString("en-IN")}.`,
          metadata: { loanId: finalLoanId, amount: approvedAmountNum, emiAmount: liveEMI },
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (_) {}

      fcToast.loanApproved(custName, approvedAmountNum, loanAccountNum);
      onClose();
    } catch (err: any) {
      fcToast.loanApprovalFailed(err?.message);
    } finally {
      setProcessing(false);
    }
  };

  const eligibilityPassed = eligibility?.eligible ?? true;
  const eligibilityBlockers = eligibility?.blockers ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-emerald-700 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Approve Loan {isApplicationMode ? "Application" : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-1">

          {/* ── Customer Profile ─────────────────────────────────────────────── */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Customer</p>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900">{custName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(customer as any)?.email || application?.customerEmail || ""}
                  {(customer as any)?.phone && ` · ${(customer as any).phone}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">Requested</p>
                <p className="font-bold text-slate-900">₹{Number(requestedAmount).toLocaleString()}</p>
                <p className="text-xs text-slate-500">{requestedTenure} months</p>
              </div>
            </div>
          </div>

          {/* ── Eligibility Checklist ─────────────────────────────────────────── */}
          <div className={`rounded-2xl p-4 border space-y-3 ${
            eligLoading ? "bg-slate-50 border-slate-100" :
            eligibilityPassed ? "bg-emerald-50 border-emerald-100" :
            "bg-red-50 border-red-100"
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eligibility Check</p>
              <div className="flex items-center gap-2">
                {eligLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                {!eligLoading && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    eligibilityPassed ? "bg-emerald-200 text-emerald-800" : "bg-red-200 text-red-800"
                  }`}>
                    {eligibilityPassed ? "✓ Eligible" : "✗ Issues Found"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={loadEligibility}
                  disabled={eligLoading}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Refresh eligibility"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${eligLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {eligLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-white/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : eligibility ? (
              <div className="space-y-2">
                {eligibility.checks.map((check) => (
                  <div
                    key={check.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${
                      check.status === "PASS" ? "bg-white border-emerald-100" :
                      check.status === "FAIL" ? "bg-white border-red-200" :
                      check.status === "WARN" ? "bg-white border-amber-200" :
                      "bg-white border-slate-100"
                    }`}
                  >
                    <span className={`text-base shrink-0 mt-0.5 ${
                      check.status === "PASS" ? "text-emerald-500" :
                      check.status === "FAIL" ? "text-red-500" :
                      check.status === "WARN" ? "text-amber-500" :
                      "text-slate-300"
                    }`}>
                      {check.status === "PASS" ? "✓" :
                       check.status === "FAIL" ? "✗" :
                       check.status === "WARN" ? "⚠" : "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{check.label}</p>
                      {check.detail && <p className="text-xs text-slate-500 mt-0.5">{check.detail}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      check.status === "PASS" ? "bg-emerald-100 text-emerald-700" :
                      check.status === "FAIL" ? "bg-red-100 text-red-700" :
                      check.status === "WARN" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-500"
                    }`}>{check.status}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {!eligLoading && eligibilityBlockers.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-700">Approval Blocked</p>
                  <ul className="mt-1 space-y-0.5">
                    {eligibilityBlockers.map((b, i) => (
                      <li key={i} className="text-xs text-red-600">· {b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* ── Loan Terms ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">
                Approved Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">₹</span>
                <Input
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="pl-7"
                  inputMode="decimal"
                  placeholder="Enter amount"
                />
              </div>
              <FieldError error={fieldErrors.approvedAmount} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">
                Interest Rate (% p.a.) <span className="text-red-500">*</span>
              </Label>
              <Input
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                placeholder="e.g. 12"
              />
              <FieldError error={fieldErrors.interestRate} />
            </div>
          </div>

          {/* EMI Preview */}
          {liveEMI > 0 && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              {[
                { label: "Monthly EMI", value: `₹${Math.round(liveEMI).toLocaleString()}`, bold: true },
                { label: "Total Repayment", value: `₹${Math.round(totalRepayment).toLocaleString()}` },
                { label: "Total Interest", value: `₹${Math.round(totalInterest).toLocaleString()}`, sub: true },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className={`${s.bold ? "text-lg font-black text-emerald-700" : "font-semibold text-slate-700"}`}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Dates ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Disbursement Date</Label>
              <Input type="date" value={disbursementDate} onChange={(e) => setDisbursementDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">First EMI Date</Label>
              <Input type="date" value={firstEmiDate} onChange={(e) => setFirstEmiDate(e.target.value)} />
            </div>
          </div>

          {/* ── Disbursement Method ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Disbursement Method</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["CASH","UPI","BANK_TRANSFER","CHEQUE"] as DisbursementMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDisbursementMethod(m)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    disbursementMethod === m
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>

            {disbursementMethod === "UPI" && (
              <div className="space-y-1.5">
                <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="UPI ID *" />
                <FieldError error={fieldErrors.disbRef} />
              </div>
            )}
            {disbursementMethod === "BANK_TRANSFER" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input value={bankAccNo} onChange={(e) => setBankAccNo(e.target.value)} placeholder="Account Number *" />
                  <FieldError error={fieldErrors.disbRef} />
                </div>
                <div>
                  <Input value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} placeholder="IFSC Code *" />
                  <FieldError error={fieldErrors.disbRef2} />
                </div>
              </div>
            )}
            {disbursementMethod === "CHEQUE" && (
              <div>
                <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} placeholder="Cheque Number *" />
                <FieldError error={fieldErrors.disbRef} />
              </div>
            )}
          </div>

          {/* ── Collector ────────────────────────────────────────────────────── */}
          {collectors.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700">Assign Collector</Label>
              <SearchSelect
                options={collectorOptions}
                value={collectorId}
                onChange={setCollectorId}
                placeholder="Select collector…"
                clearable
              />
            </div>
          )}

          {/* ── Approval Checklist ───────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">
              Approval Checklist
              <span className="ml-2 text-xs font-normal text-slate-400">
                {Object.values(checklist).filter(Boolean).length}/{CHECKLIST_ITEMS.length} completed
              </span>
            </Label>
            <div className="space-y-1.5">
              {CHECKLIST_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setChecklist((p) => ({ ...p, [item.id]: !p[item.id] }))}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    checklist[item.id]
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    checklist[item.id] ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                  }`}>
                    {checklist[item.id] && <span className="text-[10px] font-bold">✓</span>}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Notes ────────────────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Approval Notes</Label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Optional internal notes about this approval…"
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 resize-none"
            />
          </div>

          {/* ── Action Buttons ───────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-100">
            <Button variant="outline" className="sm:flex-1" onClick={onClose} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processing || (!eligLoading && !eligibilityPassed)}
              className="sm:flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {processing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                : <><CheckCircle className="w-4 h-4" /> Approve & Disburse</>
              }
            </Button>
          </div>

          {!eligLoading && !eligibilityPassed && (
            <p className="text-xs text-red-600 text-center -mt-1">
              Resolve eligibility issues above before approving.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
