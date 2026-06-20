import { useEffect } from "react";
import { format } from "date-fns";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ReceiptData {
  receiptNo: string;
  organizationName: string;
  customerName: string;
  accountNumber?: string;
  amount: number;
  savingsAmount?: number;
  loanAmount?: number;
  newBalance?: number;
  collectionType: "SAVINGS" | "LOAN_EMI" | "BOTH";
  agentName: string;
  collectedAt: Date;
  loanId?: string;
  installmentNo?: number;
  loanOutstanding?: number;
}

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  onClose: () => void;
}

function safeN(v: any): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function fmtDate(d: Date) {
  return d instanceof Date && d.getTime() > 0
    ? format(d, "dd MMM yyyy, hh:mm a")
    : "—";
}

function buildPrintHtml(r: ReceiptData): string {
  const displayBalance = safeN(r.newBalance);
  const displayOutstanding = safeN(r.loanOutstanding);
  const typeLabel =
    r.collectionType === "SAVINGS"
      ? "✓ Savings Receipt"
      : r.collectionType === "BOTH"
      ? "✓ Combined Collection Receipt"
      : "✓ EMI Payment Receipt";

  const amountRows = (() => {
    if (r.collectionType === "BOTH") {
      let rows = "";
      if (r.savingsAmount !== undefined)
        rows += `<tr><td>Savings Deposit</td><td class="amt green">₹${safeN(r.savingsAmount).toLocaleString()}</td></tr>`;
      if (r.loanAmount !== undefined)
        rows += `<tr><td>EMI Payment</td><td class="amt indigo">₹${safeN(r.loanAmount).toLocaleString()}</td></tr>`;
      rows += `<tr class="total-row"><td><strong>Total Collected</strong></td><td class="amt green"><strong>₹${safeN(r.amount).toLocaleString()}</strong></td></tr>`;
      if (r.newBalance !== undefined)
        rows += `<tr><td>New Savings Balance</td><td class="amt">₹${displayBalance.toLocaleString()}</td></tr>`;
      if (r.loanOutstanding !== undefined)
        rows += `<tr><td>Loan Outstanding</td><td class="amt">${r.loanOutstanding === 0 ? '<span class="green">LOAN CLOSED ✓</span>' : "₹" + displayOutstanding.toLocaleString()}</td></tr>`;
      return rows;
    }
    let rows = `<tr><td>${r.collectionType === "SAVINGS" ? "Amount Deposited" : "EMI Amount Paid"}</td><td class="amt green"><strong>₹${safeN(r.amount).toLocaleString()}</strong></td></tr>`;
    if (r.collectionType === "SAVINGS" && r.newBalance !== undefined)
      rows += `<tr><td>New Savings Balance</td><td class="amt">₹${displayBalance.toLocaleString()}</td></tr>`;
    if (r.collectionType === "LOAN_EMI" && r.loanOutstanding !== undefined)
      rows += `<tr><td>Outstanding Balance</td><td class="amt">${r.loanOutstanding === 0 ? '<span class="green">LOAN CLOSED ✓</span>' : "₹" + displayOutstanding.toLocaleString()}</td></tr>`;
    return rows;
  })();

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
      <div style="text-align:center;border-bottom:2px dashed #cbd5e1;padding-bottom:16px;margin-bottom:16px;">
        <div style="font-size:22px;font-weight:900;letter-spacing:-0.5px;">FundCircle</div>
        <div style="font-size:13px;font-weight:600;color:#475569;margin-top:2px;">${r.organizationName}</div>
        <div style="margin-top:8px;display:inline-block;background:#ecfdf5;color:#065f46;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;">${typeLabel}</div>
      </div>

      <div style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;margin-bottom:16px;">
        <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Receipt Number</div>
        <div style="font-size:16px;font-weight:900;font-family:monospace;margin-top:2px;">${r.receiptNo || "—"}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
        <tr><td style="color:#64748b;padding:5px 0;">Customer</td><td style="text-align:right;font-weight:600;">${r.customerName || "—"}</td></tr>
        ${r.accountNumber ? `<tr><td style="color:#64748b;padding:5px 0;">Account No.</td><td style="text-align:right;font-weight:600;font-family:monospace;">${r.accountNumber}</td></tr>` : ""}
        <tr><td style="color:#64748b;padding:5px 0;">Date &amp; Time</td><td style="text-align:right;font-weight:600;">${fmtDate(r.collectedAt)}</td></tr>
        <tr><td style="color:#64748b;padding:5px 0;">Collected By</td><td style="text-align:right;font-weight:600;">${r.agentName || "—"}</td></tr>
        ${r.collectionType === "LOAN_EMI" && r.installmentNo ? `<tr><td style="color:#64748b;padding:5px 0;">EMI Installment</td><td style="text-align:right;font-weight:600;">#${r.installmentNo}</td></tr>` : ""}
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:13px;border-top:2px dashed #cbd5e1;padding-top:12px;">
        <style>
          .amt{text-align:right;font-weight:600;}
          .green{color:#059669;}
          .indigo{color:#4f46e5;}
          .total-row td{border-top:1px solid #e2e8f0;padding-top:8px;margin-top:8px;}
        </style>
        ${amountRows}
      </table>

      <div style="border-top:2px dashed #cbd5e1;margin-top:16px;padding-top:12px;text-align:center;font-size:10px;color:#94a3b8;line-height:1.6;">
        This is a digitally generated receipt.<br/>No signature required. Powered by FundCircle.
      </div>
    </div>
  `;
}

export default function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  /*
   * Print strategy: inject a dedicated #fc-print-receipt div directly into
   * document.body, and a <style> that:
   *   - hides ALL body children during print
   *   - shows ONLY #fc-print-receipt
   * This eliminates the "second blank page" caused by the modal backdrop
   * occupying 100vh of layout space when only visibility:hidden is used.
   */
  useEffect(() => {
    if (!receipt) return;

    const tpl = document.createElement("div");
    tpl.id = "fc-print-receipt";
    tpl.innerHTML = buildPrintHtml(receipt);
    document.body.appendChild(tpl);

    const style = document.createElement("style");
    style.id = "fc-print-receipt-style";
    style.textContent = `
      #fc-print-receipt { display: none; }
      @media print {
        body > *:not(#fc-print-receipt) { display: none !important; }
        #fc-print-receipt {
          display: block !important;
          position: static !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.getElementById("fc-print-receipt")?.remove();
      document.getElementById("fc-print-receipt-style")?.remove();
    };
  }, [receipt]);

  if (!receipt) return null;

  const handlePrint = () => window.print();
  const displayBalance = safeN(receipt.newBalance);
  const displayOutstanding = safeN(receipt.loanOutstanding);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Close ✕ */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Receipt Content ──────────────────────────────────────────────── */}
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">FundCircle</h2>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">{receipt.organizationName}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
              {receipt.collectionType === "SAVINGS"
                ? "✓ Savings Receipt"
                : receipt.collectionType === "BOTH"
                ? "✓ Combined Collection Receipt"
                : "✓ EMI Payment Receipt"}
            </div>
          </div>

          {/* Receipt number */}
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt Number</p>
            <p className="text-base font-black text-slate-900 mt-0.5 font-mono tracking-wide">
              {receipt.receiptNo || "—"}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-2.5 text-sm">
            <ReceiptRow label="Customer" value={receipt.customerName || "—"} />
            {receipt.accountNumber && (
              <ReceiptRow label="Account No." value={receipt.accountNumber} />
            )}
            <ReceiptRow label="Date & Time" value={fmtDate(receipt.collectedAt)} />
            <ReceiptRow label="Collected By" value={receipt.agentName || "—"} />
            {receipt.collectionType === "LOAN_EMI" && receipt.installmentNo && (
              <ReceiptRow label="EMI Installment" value={`#${receipt.installmentNo}`} />
            )}
          </div>

          {/* Amounts */}
          <div className="border-t border-dashed border-slate-300 pt-4 space-y-2">
            {receipt.collectionType === "BOTH" ? (
              <>
                {receipt.savingsAmount !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">Savings Deposit</span>
                    <span className="font-bold text-emerald-600">₹{safeN(receipt.savingsAmount).toLocaleString()}</span>
                  </div>
                )}
                {receipt.loanAmount !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">EMI Payment</span>
                    <span className="font-bold text-indigo-600">₹{safeN(receipt.loanAmount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="font-bold text-slate-700">Total Collected</span>
                  <span className="text-xl font-black text-emerald-600">₹{safeN(receipt.amount).toLocaleString()}</span>
                </div>
                {receipt.newBalance !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">New Savings Balance</span>
                    <span className="font-bold text-slate-900">₹{displayBalance.toLocaleString()}</span>
                  </div>
                )}
                {receipt.loanOutstanding !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">Loan Outstanding</span>
                    <span className="font-bold text-slate-900">
                      {receipt.loanOutstanding === 0
                        ? <span className="text-emerald-600">LOAN CLOSED ✓</span>
                        : `₹${displayOutstanding.toLocaleString()}`}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-600">
                    {receipt.collectionType === "SAVINGS" ? "Amount Deposited" : "EMI Amount Paid"}
                  </span>
                  <span className="text-xl font-black text-emerald-600">₹{safeN(receipt.amount).toLocaleString()}</span>
                </div>
                {receipt.collectionType === "SAVINGS" && receipt.newBalance !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">New Savings Balance</span>
                    <span className="font-bold text-slate-900">₹{displayBalance.toLocaleString()}</span>
                  </div>
                )}
                {receipt.collectionType === "LOAN_EMI" && receipt.loanOutstanding !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">Outstanding Balance</span>
                    <span className="font-bold text-slate-900">
                      {receipt.loanOutstanding === 0
                        ? <span className="text-emerald-600">LOAN CLOSED ✓</span>
                        : `₹${displayOutstanding.toLocaleString()}`}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-dashed border-slate-300 pt-3 text-center">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              This is a digitally generated receipt.<br />
              No signature required. Powered by FundCircle.
            </p>
          </div>
        </div>

        {/* ── Action Buttons ───────────────────────────────────────────────── */}
        <div className="px-6 pb-6 flex gap-3">
          <Button onClick={handlePrint} variant="outline" className="flex-1 gap-2 h-11">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button onClick={onClose} className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="font-semibold text-slate-900 text-right">{value || "—"}</span>
    </div>
  );
}
