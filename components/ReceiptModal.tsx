import { format } from "date-fns";
import { X, Printer, Download } from "lucide-react";
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

export default function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:bg-white print:p-0">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm print:shadow-none print:rounded-none print:max-w-full">
        {/* Close — hidden on print */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Receipt Content */}
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-4">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">FundCircle</h2>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">{receipt.organizationName}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
              {receipt.collectionType === "SAVINGS" ? "✓ Savings Receipt"
               : receipt.collectionType === "BOTH" ? "✓ Combined Collection Receipt"
               : "✓ EMI Payment Receipt"}
            </div>
          </div>

          {/* Receipt No */}
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt Number</p>
            <p className="text-base font-black text-slate-900 mt-0.5 font-mono tracking-wide">{receipt.receiptNo}</p>
          </div>

          {/* Details */}
          <div className="space-y-2.5 text-sm">
            <ReceiptRow label="Customer" value={receipt.customerName} />
            {receipt.accountNumber && (
              <ReceiptRow label="Account No." value={receipt.accountNumber} />
            )}
            <ReceiptRow label="Date & Time" value={format(receipt.collectedAt, "dd MMM yyyy, hh:mm a")} />
            <ReceiptRow label="Collected By" value={receipt.agentName} />
            {receipt.collectionType === "LOAN_EMI" && receipt.installmentNo && (
              <ReceiptRow label="EMI Installment" value={`#${receipt.installmentNo}`} />
            )}
          </div>

          {/* Amount */}
          <div className="border-t border-dashed border-slate-300 pt-4 space-y-2">
            {receipt.collectionType === "BOTH" ? (
              <>
                {receipt.savingsAmount !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">Savings Deposit</span>
                    <span className="font-bold text-emerald-600">₹{receipt.savingsAmount.toLocaleString()}</span>
                  </div>
                )}
                {receipt.loanAmount !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">EMI Payment</span>
                    <span className="font-bold text-indigo-600">₹{receipt.loanAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="font-bold text-slate-700">Total Collected</span>
                  <span className="text-xl font-black text-emerald-600">₹{receipt.amount.toLocaleString()}</span>
                </div>
                {receipt.newBalance !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">New Savings Balance</span>
                    <span className="font-bold text-slate-900">₹{receipt.newBalance.toLocaleString()}</span>
                  </div>
                )}
                {receipt.loanOutstanding !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">Loan Outstanding</span>
                    <span className="font-bold text-slate-900">
                      {receipt.loanOutstanding === 0
                        ? <span className="text-emerald-600">LOAN CLOSED ✓</span>
                        : `₹${receipt.loanOutstanding.toLocaleString()}`}
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
                  <span className="text-xl font-black text-emerald-600">₹{receipt.amount.toLocaleString()}</span>
                </div>
                {receipt.collectionType === "SAVINGS" && receipt.newBalance !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">New Savings Balance</span>
                    <span className="font-bold text-slate-900">₹{receipt.newBalance.toLocaleString()}</span>
                  </div>
                )}
                {receipt.collectionType === "LOAN_EMI" && receipt.loanOutstanding !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600">Outstanding Balance</span>
                    <span className="font-bold text-slate-900">
                      {receipt.loanOutstanding === 0 ? (
                        <span className="text-emerald-600">LOAN CLOSED ✓</span>
                      ) : (
                        `₹${receipt.loanOutstanding.toLocaleString()}`
                      )}
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

        {/* Action buttons — hidden on print */}
        <div className="px-6 pb-6 flex gap-2 print:hidden">
          <Button onClick={handlePrint} variant="outline" className="flex-1 gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button onClick={onClose} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2">
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
      <span className="font-semibold text-slate-900 text-right">{value}</span>
    </div>
  );
}
