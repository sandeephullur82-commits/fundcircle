import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { XCircle, Loader2, AlertTriangle } from "lucide-react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createAuditLog } from "@/lib/services";
import { LoanApplication, Loan } from "@/types";

const REJECT_REASONS = [
  "Insufficient repayment capacity",
  "Active loan already exists",
  "Overdue EMI history",
  "Incomplete documentation",
  "Low credit score",
  "Loan amount exceeds eligibility",
  "Employment instability",
  "Nominee information missing",
  "Fraudulent application suspected",
  "Organization policy restriction",
  "Other (specify below)",
];

interface Props {
  open: boolean;
  target: LoanApplication | Loan | null;
  targetType: "application" | "loan";
  actorId: string;
  actorName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoanRejectDialog({ open, target, targetType, actorId, actorName, onClose, onSuccess }: Props) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const needsCustom = selectedReason === "Other (specify below)";
  const finalReason = needsCustom ? customReason.trim() : selectedReason;
  const canSubmit = selectedReason && (!needsCustom || customReason.trim().length >= 5);

  const reset = () => {
    setSelectedReason("");
    setCustomReason("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleReject = async () => {
    if (!target || !canSubmit) return;
    setRejecting(true);
    try {
      const collectionName = targetType === "application" ? "loanApplications" : "loans";
      await updateDoc(doc(db, collectionName, target.id), {
        status: "REJECTED",
        rejectionReason: finalReason,
        reviewedByActorId: actorId,
        reviewedByActorName: actorName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const customerName = (target as any).customerName || (target as any).customerId?.slice(-6) || "Customer";
      await createAuditLog({
        organizationId: (target as any).organizationId,
        actorId,
        actorRole: "OWNER",
        actorName,
        action: "LOAN_REJECTED",
        module: "LOANS",
        category: "REJECT",
        entityType: targetType === "application" ? "LoanApplication" : "Loan",
        entityId: target.id,
        description: `Loan ${targetType} rejected for ${customerName}`,
        newValues: { status: "REJECTED", rejectionReason: finalReason },
        metadata: { customerName, rejectionReason: finalReason },
      });

      toast.success("Application Rejected", {
        description: `${customerName}'s loan application has been declined.`,
      });
      reset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Rejection Failed", { description: err?.message || "Please try again." });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Reject Loan Application
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">
              This will permanently reject the loan application. The customer will be notified.
              A reason is required for audit compliance.
            </p>
          </div>

          {target && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1.5">Application</p>
              <p className="font-semibold text-slate-900 text-sm">
                {(target as any).customerName || "Customer"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                ₹{Number((target as any).loanAmount || (target as any).principalAmount || 0).toLocaleString()} ·{" "}
                {(target as any).tenureMonths || 0} months
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">
              Rejection Reason <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-1.5">
              {REJECT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                    selectedReason === reason
                      ? "bg-red-50 border-red-300 text-red-800 font-medium"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {needsCustom && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">
                Specify Reason <span className="text-red-500">*</span>
              </Label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter a detailed rejection reason…"
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/30 resize-none"
              />
              <p className="text-xs text-slate-400 text-right">{customReason.length}/500</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={rejecting}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!canSubmit || rejecting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Reject Application
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
