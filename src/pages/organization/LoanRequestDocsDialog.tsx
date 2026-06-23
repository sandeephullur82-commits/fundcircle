import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Loader2, Plus, X } from "lucide-react";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createAuditLog } from "@/lib/services";
import { LoanApplication } from "@/types";

const COMMON_DOCS = [
  "Aadhaar Card (Front & Back)",
  "PAN Card",
  "Recent Passport Photo",
  "Bank Statement (last 3 months)",
  "Salary Slip / Income Proof",
  "Employment Certificate",
  "Business Registration Certificate",
  "Property Documents",
  "Guarantor Aadhaar Card",
  "Guarantor PAN Card",
];

interface Props {
  open: boolean;
  application: LoanApplication | null;
  actorId: string;
  actorName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LoanRequestDocsDialog({ open, application, actorId, actorName, onClose, onSuccess }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [customDoc, setCustomDoc] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggle = (doc: string) => {
    setSelected((prev) =>
      prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]
    );
  };

  const addCustom = () => {
    const t = customDoc.trim();
    if (!t || selected.includes(t)) return;
    setSelected((prev) => [...prev, t]);
    setCustomDoc("");
  };

  const reset = () => {
    setSelected([]);
    setCustomDoc("");
    setNotes("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!application || selected.length === 0) {
      toast.error("Select at least one document to request.");
      return;
    }
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "loanApplications", application.id), {
        status: "DOCUMENTS_REQUESTED",
        documentsRequested: selected,
        documentRequestNotes: notes.trim(),
        documentRequestedAt: serverTimestamp(),
        documentRequestedByActorId: actorId,
        documentRequestedByActorName: actorName,
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "notifications"), {
        userId: application.customerId,
        organizationId: application.organizationId,
        type: "DOCUMENTS_REQUESTED",
        title: "Documents Required",
        message: `Please submit the following documents for your loan application: ${selected.slice(0, 3).join(", ")}${selected.length > 3 ? ` and ${selected.length - 3} more` : ""}.`,
        metadata: { applicationId: application.id, documents: selected, notes: notes.trim() },
        read: false,
        createdAt: serverTimestamp(),
      });

      await createAuditLog({
        organizationId: application.organizationId,
        actorId,
        actorRole: "OWNER",
        actorName,
        action: "LOAN_DOCUMENTS_REQUESTED",
        module: "LOANS",
        category: "UPDATE",
        entityType: "LoanApplication",
        entityId: application.id,
        description: `Documents requested for loan application by ${application.customerName || "customer"}`,
        newValues: { status: "DOCUMENTS_REQUESTED", documentsRequested: selected },
        metadata: { customerName: application.customerName, documents: selected },
      });

      toast.success("Documents Requested", {
        description: `${application.customerName || "Customer"} has been notified to submit ${selected.length} document(s).`,
      });
      reset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Failed to send request", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-blue-700 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Request Documents
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {application && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Customer</p>
              <p className="font-semibold text-slate-900 text-sm">{application.customerName || "Customer"}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                ₹{Number(application.loanAmount || 0).toLocaleString()} · {application.tenureMonths || 0} months
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700">
              Required Documents <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-slate-400">Select all documents the customer needs to submit.</p>
            <div className="grid grid-cols-1 gap-1.5">
              {COMMON_DOCS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggle(d)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                    selected.includes(d)
                      ? "bg-blue-50 border-blue-300 text-blue-800 font-medium"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    selected.includes(d) ? "bg-blue-500 border-blue-500 text-white" : "border-slate-300"
                  }`}>
                    {selected.includes(d) && <span className="text-[10px] font-bold">✓</span>}
                  </span>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Add Custom Document</Label>
            <div className="flex gap-2">
              <input
                value={customDoc}
                onChange={(e) => setCustomDoc(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
                placeholder="e.g. Rental Agreement"
                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
              />
              <Button type="button" size="sm" variant="outline" onClick={addCustom}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {selected.filter((d) => !COMMON_DOCS.includes(d)).map((d) => (
              <div key={d} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm text-blue-800 flex-1">{d}</span>
                <button type="button" onClick={() => toggle(d)}>
                  <X className="w-4 h-4 text-blue-500" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-700">Additional Notes</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or deadlines…"
              rows={2}
              maxLength={300}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 resize-none"
            />
          </div>

          {selected.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <p className="text-xs text-blue-600 font-semibold">{selected.length} document(s) selected</p>
              <p className="text-xs text-blue-500 mt-0.5">The customer will be notified immediately.</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selected.length === 0 || submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Send Request
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
