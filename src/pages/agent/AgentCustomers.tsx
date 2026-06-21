import { useState, useMemo } from "react";
import { useCollectionRealtime } from "@/lib/firestore-hooks";
import { Membership, Collection, Loan } from "@/types";
import {
  ChevronDown, ChevronUp, PiggyBank, CreditCard, IndianRupee,
  Users, Phone, MapPin, UserCheck, Search, X,
} from "lucide-react";
import { format, startOfDay } from "date-fns";
import { useUser, useOrganization } from "@clerk/clerk-react";
import { where } from "firebase/firestore";
import CollectDialog, { toDate } from "@/components/agent/CollectDialog";

interface AgentCustomersProps {
  onCollect?: () => void;
}

function safeN(v: any) { const n = Number(v); return isFinite(n) ? n : 0; }
function shortId(id: string) { return `FC-${id.slice(-6).toUpperCase()}`; }

export default function AgentCustomers({ onCollect }: AgentCustomersProps) {
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
  const { data: savingsAccounts } = useCollectionRealtime<any>("savings_accounts");
  const { data: loans }           = useCollectionRealtime<Loan>("loans", [where("status", "==", "ACTIVE")]);
  const { data: collections }     = useCollectionRealtime<Collection>("collections", [
    where("agentId", "==", agentId || "NONE"),
  ]);

  const [expandedId,       setExpandedId]       = useState<string | null>(null);
  const [collectCustomer,  setCollectCustomer]  = useState<any | null>(null);
  const [searchQuery,      setSearchQuery]       = useState("");

  const today = startOfDay(new Date());

  const activeCustomers = allCustomers
    .filter((c) => (c as any).status === "ACTIVE")
    .sort((a, b) => a.id.localeCompare(b.id));

  // Search by Customer ID only (FC-XXXXXX prefix match)
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (!q) return activeCustomers;
    return activeCustomers.filter((c) => shortId(c.id).includes(q));
  }, [activeCustomers, searchQuery]);

  const getSavingsAccount = (c: Membership) =>
    savingsAccounts.find((s: any) => s.customerId === c.id || s.customerId === c.clerkUserId);

  const getActiveLoan = (c: Membership) =>
    loans.find((l) => (l.customerId === c.id || l.customerId === c.clerkUserId) && l.status === "ACTIVE");

  const getLastCollection = (c: Membership) => {
    const cols = collections
      .filter((x) => x.customerId === c.id || x.customerId === c.clerkUserId)
      .sort((a, b) =>
        toDate(b.collectedAt || (b as any).timestamp).valueOf() -
        toDate(a.collectedAt || (a as any).timestamp).valueOf()
      );
    return cols[0] || null;
  };

  const collectedToday = (c: Membership) => {
    const todayCols = collections.filter((x) => toDate(x.collectedAt || (x as any).timestamp) >= today);
    return todayCols.some((x) => x.customerId === c.id || x.customerId === c.clerkUserId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">My Customers</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {activeCustomers.length} assigned · sorted by Customer ID
        </p>
      </div>

      {/* Search by Customer ID only */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Customer ID  (FC-XXXXXX)"
          className="w-full h-12 pl-10 pr-10 rounded-2xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-slate-500">
            {searchQuery ? "No customers match that ID." : "No customers assigned yet."}
          </p>
          {searchQuery && (
            <p className="text-xs mt-1">Try searching with the full ID like <strong>FC-AB1234</strong></p>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((customer) => {
            const c          = customer as any;
            const name       = c.fullName || c.name || c.email || "Customer";
            const isExpanded = expandedId === customer.id;
            const savAcc     = getSavingsAccount(customer);
            const loan       = getActiveLoan(customer);
            const lastCol    = getLastCollection(customer);
            const isDone     = collectedToday(customer);

            return (
              <div
                key={customer.id}
                className={`rounded-2xl border overflow-hidden transition-shadow bg-white ${
                  isExpanded ? "shadow-md border-emerald-200" : "shadow-sm border-slate-200"
                }`}
              >
                {/* Collapsed header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : customer.id)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
                          {shortId(customer.id)}
                        </span>
                        {isDone && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                            ✓ Done
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 truncate">{name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">{c.phone || c.email || "—"}</p>
                      <div className="flex items-center gap-4 mt-1.5">
                        {savAcc && (
                          <div className="flex items-center gap-1">
                            <PiggyBank className="w-3 h-3 text-emerald-500" />
                            <span className="text-xs font-semibold text-emerald-700">
                              ₹{safeN(savAcc.totalBalance).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {loan && (
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-indigo-500" />
                            <span className="text-xs font-semibold text-indigo-700">
                              ₹{safeN(loan.outstandingBalance).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {!savAcc && !loan && (
                          <span className="text-xs text-slate-400 italic">No active accounts</span>
                        )}
                      </div>
                    </div>
                    <div className={`shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""} mt-1`}>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-4 pb-4 pt-3 space-y-4">
                    {/* Customer details grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <InfoRow label="Customer ID" value={shortId(customer.id)} mono />
                      <InfoRow label="Status" value={c.status || "ACTIVE"} />
                      <InfoRow label="Mobile" value={c.phone || "—"} />
                      {savAcc?.accountNumber && <InfoRow label="Account No." value={savAcc.accountNumber} mono />}
                      {savAcc?.planName && <InfoRow label="Savings Plan" value={savAcc.planName} />}
                      {savAcc && <InfoRow label="Current Balance" value={`₹${safeN(savAcc.totalBalance).toLocaleString()}`} green />}
                      {savAcc && <InfoRow label="Total Deposited" value={`₹${safeN(savAcc.totalBalance).toLocaleString()}`} />}
                      {savAcc?.scheduledAmount && (
                        <InfoRow label="Daily Amount" value={`₹${safeN(savAcc.scheduledAmount).toLocaleString()}`} />
                      )}
                    </div>

                    {/* Address */}
                    {c.address && (
                      <div className="flex items-start gap-2 text-sm text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-xs leading-relaxed">{c.address}</span>
                      </div>
                    )}

                    {/* Last collection */}
                    {lastCol && (
                      <div className="bg-white rounded-xl p-3 border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                          Last Collection
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-600">
                              {toDate(lastCol.collectedAt || (lastCol as any).timestamp).getTime() > 0
                                ? format(toDate(lastCol.collectedAt || (lastCol as any).timestamp), "d MMM yyyy · h:mm a")
                                : "—"}
                            </p>
                            {lastCol.receiptNo && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{lastCol.receiptNo}</p>
                            )}
                          </div>
                          <p className="font-bold text-emerald-600">₹{safeN(lastCol.amount).toLocaleString()}</p>
                        </div>
                      </div>
                    )}

                    {/* Action button */}
                    <button
                      onClick={() => setCollectCustomer(customer)}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold transition-colors ${
                        savAcc && loan ? "bg-violet-600 hover:bg-violet-700"
                        : loan         ? "bg-indigo-600 hover:bg-indigo-700"
                        :                "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      <IndianRupee className="w-4 h-4" />
                      {savAcc && loan ? "Collect Both" : loan ? "EMI Entry" : savAcc ? "Savings Entry" : "Collect"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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

function InfoRow({ label, value, mono, green }: { label: string; value: string; mono?: boolean; green?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-semibold ${green ? "text-emerald-700" : "text-slate-800"} ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}
