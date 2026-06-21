import { useState } from "react";
import { useCollectionRealtime } from "@/lib/firestore-hooks";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { Collection, Membership } from "@/types";
import { Receipt, PiggyBank, CreditCard, Layers, ChevronDown, Banknote, Smartphone, Printer } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { where } from "firebase/firestore";
import { toDate } from "@/components/agent/CollectDialog";
import ReceiptModal, { ReceiptData } from "@/components/ReceiptModal";

function safeN(v: any) { const n = Number(v); return isFinite(n) ? n : 0; }

type FilterId = "all" | "today";

const PAGE_SIZE = 20;

function getType(col: Collection): "SAVINGS" | "EMI" | "COMBINED" {
  const t = col.collectionType || "SAVINGS";
  if (t === "LOAN_EMI") return "EMI";
  if (t === "BOTH")     return "COMBINED";
  return "SAVINGS";
}

export default function AgentHistory() {
  const { user }         = useUser();
  const { organization } = useOrganization();

  const agentId   = user?.id    || "";
  const agentName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Agent";
  const orgName   = organization?.name || "FundCircle";

  const { data: myCollections, loading } = useCollectionRealtime<Collection>(
    "collections",
    agentId ? [where("agentId", "==", agentId)] : []
  );
  const { data: members } = useCollectionRealtime<Membership>("organizationMembers", [
    where("role", "==", "CUSTOMER"),
  ]);

  const [filter,     setFilter]     = useState<FilterId>("all");
  const [page,       setPage]       = useState(1);
  const [viewReceipt, setViewReceipt] = useState<ReceiptData | null>(null);

  const getCustName = (col: Collection) => {
    const m = members.find((x) => x.id === col.customerId || x.clerkUserId === col.customerId);
    return (m as any)?.fullName || (m as any)?.name || col.customerId?.slice(-6) || "Customer";
  };

  const getCustAccountNo = (col: Collection) => {
    const m = members.find((x) => x.id === col.customerId || x.clerkUserId === col.customerId);
    return (m as any)?.accountNumber || undefined;
  };

  const buildReceiptData = (col: Collection): ReceiptData => ({
    receiptNo:        col.receiptNo || "—",
    organizationName: orgName,
    customerName:     getCustName(col),
    accountNumber:    getCustAccountNo(col),
    amount:           safeN(col.amount),
    savingsAmount:    col.savingsAmount !== undefined ? safeN(col.savingsAmount) : undefined,
    loanAmount:       col.loanAmount   !== undefined ? safeN(col.loanAmount)    : undefined,
    newBalance:       (col as any).newBalance        !== undefined ? safeN((col as any).newBalance)        : undefined,
    collectionType:   (col.collectionType as any)    || "SAVINGS",
    agentName:        col.collectedByName             || agentName,
    collectedAt:      toDate(col.collectedAt || (col as any).timestamp),
    installmentNo:    (col as any).installmentNo     || undefined,
    loanOutstanding:  (col as any).loanOutstanding   !== undefined ? safeN((col as any).loanOutstanding) : undefined,
  });

  const handleView = (col: Collection) => {
    setViewReceipt(buildReceiptData(col));
  };

  const handlePrint = (col: Collection) => {
    setViewReceipt(buildReceiptData(col));
    setTimeout(() => window.print(), 400);
  };

  const sorted = [...myCollections].sort(
    (a, b) =>
      toDate(b.collectedAt || (b as any).timestamp).valueOf() -
      toDate(a.collectedAt || (a as any).timestamp).valueOf()
  );

  const filtered = filter === "today"
    ? sorted.filter((c) => isToday(toDate(c.collectedAt || (c as any).timestamp)))
    : sorted;

  const todayItems     = filtered.filter((c) => isToday(toDate(c.collectedAt     || (c as any).timestamp)));
  const yesterdayItems = filtered.filter((c) => isYesterday(toDate(c.collectedAt || (c as any).timestamp)));
  const olderItems     = filtered.filter((c) => {
    const d = toDate(c.collectedAt || (c as any).timestamp);
    return d.getTime() > 0 && !isToday(d) && !isYesterday(d);
  });

  const paginated = olderItems.slice(0, page * PAGE_SIZE);
  const hasMore   = page * PAGE_SIZE < olderItems.length;

  const totalAmt  = filtered.reduce((s, c) => s + safeN(c.amount), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Receipts</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {filtered.length} receipts · ₹{totalAmt.toLocaleString()} total
        </p>
      </div>

      {/* Filter: All / Today */}
      <div className="flex gap-2">
        {([
          { id: "all",   label: "All Receipts" },
          { id: "today", label: "Today" },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setFilter(id); setPage(1); }}
            className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-colors min-h-[44px] ${
              filter === id
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Receipt list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No receipts found.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <DateGroup label="Today" items={todayItems} onView={handleView} onPrint={handlePrint} getCustName={getCustName} />
          <DateGroup label="Yesterday" items={yesterdayItems} onView={handleView} onPrint={handlePrint} getCustName={getCustName} />
          {olderItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Older</p>
                <p className="text-xs text-slate-400">{olderItems.length} records</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {paginated.map((col, i) => (
                  <ReceiptCard
                    key={col.id}
                    col={col}
                    custName={getCustName(col)}
                    onView={handleView}
                    onPrint={handlePrint}
                    divider={i > 0}
                  />
                ))}
              </div>
              {hasMore && (
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="w-full mt-2 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  <ChevronDown className="w-4 h-4" />
                  Load {Math.min(PAGE_SIZE, olderItems.length - paginated.length)} more
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <ReceiptModal receipt={viewReceipt} onClose={() => setViewReceipt(null)} />
    </div>
  );
}

function DateGroup({
  label, items, onView, onPrint, getCustName,
}: {
  label: string;
  items: Collection[];
  onView: (c: Collection) => void;
  onPrint: (c: Collection) => void;
  getCustName: (c: Collection) => string;
}) {
  if (items.length === 0) return null;
  const total = items.reduce((s, c) => s + safeN(c.amount), 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">{label}</p>
        <p className="text-xs font-semibold text-emerald-600">
          ₹{total.toLocaleString()} · {items.length} txn{items.length > 1 ? "s" : ""}
        </p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {items.map((col, i) => (
          <ReceiptCard
            key={col.id}
            col={col}
            custName={getCustName(col)}
            onView={onView}
            onPrint={onPrint}
            divider={i > 0}
          />
        ))}
      </div>
    </div>
  );
}

function ReceiptCard({
  col, custName, onView, onPrint, divider,
}: {
  col: Collection;
  custName: string;
  onView: (c: Collection) => void;
  onPrint: (c: Collection) => void;
  divider?: boolean;
}) {
  const type = getType(col);
  const d    = toDate(col.collectedAt || (col as any).timestamp);
  const mode = col.paymentMode || "CASH";

  return (
    <div className={`px-4 py-3 ${divider ? "border-t border-slate-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        {/* Type icon + info */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            type === "EMI"      ? "bg-indigo-100"
            : type === "COMBINED" ? "bg-violet-100"
            : "bg-emerald-100"
          }`}>
            {type === "EMI"      && <CreditCard className="w-4 h-4 text-indigo-600" />}
            {type === "COMBINED" && <Layers     className="w-4 h-4 text-violet-600" />}
            {type === "SAVINGS"  && <PiggyBank  className="w-4 h-4 text-emerald-600" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm truncate">{custName}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {col.receiptNo && (
                <span className="text-[9px] font-mono text-slate-400">{col.receiptNo}</span>
              )}
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                mode === "UPI"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}>{mode}</span>
              <span className="text-[10px] text-slate-400">
                {d.getTime() > 0 ? format(d, "d MMM · h:mm a") : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Amount + actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <p className="font-bold text-emerald-600 text-sm">+₹{safeN(col.amount).toLocaleString()}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onView(col)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
            >
              View
            </button>
            <button
              onClick={() => onPrint(col)}
              title="Print Receipt"
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
