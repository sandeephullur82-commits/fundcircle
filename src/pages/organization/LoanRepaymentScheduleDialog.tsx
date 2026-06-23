import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loan, LoanInstallment } from "@/types";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import {
  Calendar, CheckCircle, Clock, AlertTriangle, Loader2,
  TrendingDown, CreditCard, Download,
} from "lucide-react";

interface Props {
  open: boolean;
  loan: Loan | null;
  customerName?: string;
  onClose: () => void;
}

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

const STATUS_CONFIG = {
  PAID:    { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "Paid" },
  OVERDUE: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-100", label: "Overdue" },
  PENDING: { icon: Clock, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-100", label: "Pending" },
};

export default function LoanRepaymentScheduleDialog({ open, loan, customerName, onClose }: Props) {
  const [installments, setInstallments] = useState<LoanInstallment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!loan?.id || !open) { setInstallments([]); return; }
    setLoading(true);
    const q = query(collection(db, "loan_installments"), where("loanId", "==", loan.id));
    const unsub = onSnapshot(q, (snap) => {
      setInstallments(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as LoanInstallment))
          .sort((a, b) => a.installmentNo - b.installmentNo)
      );
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [loan?.id, open]);

  if (!loan) return null;

  const principal = loan.principalAmount ?? (loan as any).principal ?? 0;
  const emi = loan.emiAmount ?? 0;
  const tenure = loan.tenureMonths ?? 0;
  const outstanding = loan.outstandingBalance ?? 0;
  const paidCount = installments.filter((i) => i.status === "PAID").length;
  const overdueCount = installments.filter((i) => i.status === "OVERDUE").length;
  const totalPaid = installments.filter((i) => i.status === "PAID").reduce((s, i) => s + (i.paidAmount || i.emiAmount || 0), 0);
  const progressPct = tenure > 0 ? Math.round((paidCount / tenure) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Repayment Schedule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Loan summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{customerName || "Customer"}</p>
                <p className="text-xs text-slate-500">
                  {loan.loanAccountNumber || `ID: ${loan.id.slice(-8).toUpperCase()}`}
                </p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                loan.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                loan.status === "CLOSED" ? "bg-slate-100 text-slate-500 border-slate-200" :
                "bg-amber-50 text-amber-700 border-amber-100"
              }`}>{loan.status}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Principal", value: `₹${Number(principal).toLocaleString()}` },
                { label: "EMI / Month", value: `₹${Number(emi).toLocaleString()}` },
                { label: "Tenure", value: `${tenure} months` },
                { label: "Outstanding", value: `₹${Number(outstanding).toLocaleString()}`, highlight: outstanding > 0 },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-xl p-2.5 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</p>
                  <p className={`font-bold text-sm mt-0.5 ${s.highlight ? "text-orange-600" : "text-slate-900"}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">{paidCount}/{tenure} installments paid</span>
                <span className="font-bold text-slate-700">{progressPct}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="text-emerald-600 font-medium">✓ Paid: ₹{Number(totalPaid).toLocaleString()}</span>
                {overdueCount > 0 && <span className="text-red-600 font-medium">⚠ {overdueCount} overdue</span>}
              </div>
            </div>
          </div>

          {/* Schedule table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : installments.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No installments found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {installments.map((inst) => {
                const st = (inst.status || "PENDING").toUpperCase() as keyof typeof STATUS_CONFIG;
                const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.PENDING;
                const Icon = cfg.icon;
                const dueDate = toDate(inst.dueDate);
                const isToday = new Date().toDateString() === dueDate.toDateString();
                const isPast = dueDate < new Date() && inst.status !== "PAID";

                return (
                  <div
                    key={inst.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${cfg.bg} ${cfg.border} ${isToday ? "ring-2 ring-blue-400/30" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      st === "PAID" ? "bg-emerald-100" : st === "OVERDUE" ? "bg-red-100" : "bg-slate-100"
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">#{inst.installmentNo}</span>
                        <span className="text-sm font-semibold text-slate-900">
                          ₹{Number(inst.emiAmount).toLocaleString()}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">Today</span>
                        )}
                        {isPast && st !== "PAID" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">Late</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Due: {dueDate > new Date(1000) ? format(dueDate, "dd MMM yyyy") : "—"}
                        {inst.paidAt && toDate(inst.paidAt) > new Date(1000) && (
                          <span className="ml-2 text-emerald-600">
                            · Paid: {format(toDate(inst.paidAt), "dd MMM yyyy")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      {st === "PAID" && inst.paidAmount && inst.paidAmount !== inst.emiAmount && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Paid: ₹{Number(inst.paidAmount).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
