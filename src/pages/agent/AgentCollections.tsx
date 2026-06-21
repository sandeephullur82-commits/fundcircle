import { useState, useRef } from "react";
import { useCollectionRealtime } from "@/lib/firestore-hooks";
import { Membership, Collection } from "@/types";
import {
  IndianRupee, PiggyBank, CheckCircle, Clock, Users,
  Trash2, Edit3, X, RefreshCw, AlertTriangle,
} from "lucide-react";
import { startOfDay } from "date-fns";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { where, doc, writeBatch, increment, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CollectDialog, { toDate } from "@/components/agent/CollectDialog";
import { toast } from "sonner";

type FilterId = "all" | "collected" | "pending";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all",       label: "All"       },
  { id: "collected", label: "Collected" },
  { id: "pending",   label: "Pending"   },
];

function safeN(v: any) { const n = Number(v); return isFinite(n) ? n : 0; }

function shortId(id: string) { return `FC-${id.slice(-6).toUpperCase()}`; }

export default function AgentCollections() {
  const { user }         = useUser();
  const { organization } = useOrganization();

  const agentId   = user?.id || "";
  const agentName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Agent";
  const orgId     = organization?.id || "";
  const orgName   = organization?.name || "FundCircle";

  const { data: allCustomers, loading } = useCollectionRealtime<Membership>("organizationMembers", [
    where("role",            "==", "CUSTOMER"),
    where("assignedAgentId", "==", agentId || "NONE"),
  ]);
  const { data: collections } = useCollectionRealtime<Collection>("collections", [
    where("agentId", "==", agentId || "NONE"),
  ]);
  const { data: savingsAccounts } = useCollectionRealtime<any>("savings_accounts");

  const [filter,          setFilter]          = useState<FilterId>("all");
  const [collectCustomer, setCollectCustomer] = useState<Membership | null>(null);
  const [deleteTarget,    setDeleteTarget]    = useState<Membership | null>(null);
  const [deleting,        setDeleting]        = useState(false);
  const [editTarget,      setEditTarget]      = useState<Membership | null>(null);
  const [editAmount,      setEditAmount]      = useState("");
  const [editSaving,      setEditSaving]      = useState(false);

  const today = startOfDay(new Date());

  const todayCollections = collections.filter(
    (c) => toDate(c.collectedAt || (c as any).timestamp) >= today
  );

  const activeCustomers = allCustomers
    .filter((c) => (c as any).status === "ACTIVE")
    .sort((a, b) => a.id.localeCompare(b.id));

  const hasDoneToday = (c: Membership) =>
    todayCollections.some((col) => col.customerId === c.id || col.customerId === c.clerkUserId);

  const getSavingsAccount = (c: Membership) =>
    savingsAccounts.find((s: any) => s.customerId === c.id || s.customerId === c.clerkUserId);

  const getTodayCol = (c: Membership): Collection | null =>
    [...todayCollections]
      .filter((col) => col.customerId === c.id || col.customerId === c.clerkUserId)
      .sort((a, b) =>
        toDate(b.collectedAt || (b as any).timestamp).valueOf() -
        toDate(a.collectedAt || (a as any).timestamp).valueOf()
      )[0] ?? null;

  const filtered = activeCustomers.filter((c) => {
    if (filter === "collected") return hasDoneToday(c);
    if (filter === "pending")   return !hasDoneToday(c);
    return true;
  });

  const todayTotal     = todayCollections.reduce((s, c) => s + safeN(c.amount), 0);
  const pendingCount   = activeCustomers.filter((c) => !hasDoneToday(c)).length;
  const collectedCount = activeCustomers.length - pendingCount;

  // ── Delete collection (reverse savings balance) ─────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    const col = getTodayCol(deleteTarget);
    if (!col) { setDeleteTarget(null); return; }

    setDeleting(true);
    try {
      const batch = writeBatch(db);

      // Delete the collection document
      batch.delete(doc(db, "collections", col.id));

      // Reverse savings balance if applicable
      const savAcc = getSavingsAccount(deleteTarget);
      const savingsAmt = safeN(col.savingsAmount ?? (col.collectionType === "SAVINGS" ? col.amount : 0));
      if (savAcc && savingsAmt > 0) {
        batch.update(doc(db, "savings_accounts", savAcc.id), {
          totalBalance: increment(-savingsAmt),
          updatedAt:    serverTimestamp(),
        });
      }

      await batch.commit();
      toast.success("Collection reversed successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to reverse collection.");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── Edit daily amount (savings account scheduledAmount) ─────────────────
  const openEdit = (customer: Membership) => {
    const savAcc = getSavingsAccount(customer);
    setEditAmount(String(safeN(savAcc?.scheduledAmount) || ""));
    setEditTarget(customer);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    const amt = safeN(editAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount greater than 0."); return; }

    const savAcc = getSavingsAccount(editTarget);
    if (!savAcc) { toast.error("No savings account found for this customer."); return; }

    setEditSaving(true);
    try {
      await updateDoc(doc(db, "savings_accounts", savAcc.id), {
        scheduledAmount: amt,
        updatedAt:       serverTimestamp(),
      });
      toast.success("Daily amount updated.");
      setEditTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update amount.");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Collection Entry</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          ₹{todayTotal.toLocaleString()} collected · {collectedCount}/{activeCustomers.length} done
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-50 rounded-2xl p-3 text-center">
          <p className="text-lg font-black text-emerald-700">₹{todayTotal.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">Collected</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-3 text-center">
          <p className="text-lg font-black text-amber-700">{pendingCount}</p>
          <p className="text-[10px] text-amber-600 mt-0.5 font-medium">Pending</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-3 text-center">
          <p className="text-lg font-black text-slate-700">{activeCustomers.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5 font-medium">Total</p>
        </div>
      </div>

      {/* Filter pills — All / Collected / Pending */}
      <div className="flex gap-2">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-colors min-h-[44px] ${
              filter === id
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {label}
            {id === "pending"   && pendingCount   > 0 && ` (${pendingCount})`}
            {id === "collected" && collectedCount > 0 && ` (${collectedCount})`}
          </button>
        ))}
      </div>

      {/* Customer Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-[88px] bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          {filter === "pending" ? (
            <>
              <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
              <p className="font-semibold text-emerald-600">All done for today!</p>
              <p className="text-xs mt-1">Every customer has been collected.</p>
            </>
          ) : (
            <>
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-500">No customers found.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((customer) => {
            const c       = customer as any;
            const name    = c.fullName || c.name || c.email || "Customer";
            const done    = hasDoneToday(customer);
            const savAcc  = getSavingsAccount(customer);
            const dailyAmt = safeN(savAcc?.scheduledAmount);
            const balance  = safeN(savAcc?.totalBalance);

            return (
              <div
                key={customer.id}
                className={`rounded-2xl border p-4 transition-all ${
                  done
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Customer info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                        {shortId(customer.id)}
                      </span>
                      {done && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          ✓ Collected
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-sm mt-1 truncate">{name}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs">
                      <span className="text-slate-500">
                        Daily: <strong className="text-slate-700">
                          {dailyAmt > 0 ? `₹${dailyAmt.toLocaleString()}` : "—"}
                        </strong>
                      </span>
                      <span className="text-slate-500">
                        Balance: <strong className="text-emerald-700">₹{balance.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    {/* Edit daily amount */}
                    <button
                      onClick={() => openEdit(customer)}
                      title="Edit daily amount"
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                    </button>

                    {/* Delete today's collection */}
                    {done && (
                      <button
                        onClick={() => setDeleteTarget(customer)}
                        title="Reverse today's collection"
                        className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    )}

                    {/* Collect */}
                    {!done ? (
                      <button
                        onClick={() => setCollectCustomer(customer)}
                        className="flex items-center gap-1.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-4 py-2.5 rounded-xl transition-colors min-h-[44px]"
                      >
                        <IndianRupee className="w-4 h-4" /> Collect
                      </button>
                    ) : (
                      <button
                        onClick={() => setCollectCustomer(customer)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-2 rounded-xl transition-colors"
                      >
                        <PiggyBank className="w-3.5 h-3.5" /> More
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete Confirmation Dialog ──────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Reverse Collection?</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will delete today's collection for{" "}
                  <strong>{(deleteTarget as any).fullName || (deleteTarget as any).name}</strong>{" "}
                  and reverse the balance.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "Reversing…" : "Reverse"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Daily Amount Sheet ──────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900">Edit Daily Amount</p>
              <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-xl hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Customer: <strong>{(editTarget as any).fullName || (editTarget as any).name}</strong>
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  min="1"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full h-12 pl-8 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditTarget(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {editSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CollectDialog
        customer={collectCustomer}
        orgId={orgId}
        orgName={orgName}
        agentId={agentId}
        agentName={agentName}
        onClose={() => setCollectCustomer(null)}
      />
    </div>
  );
}
