import React, { useState, useEffect } from "react";
import { useCollectionRealtime, useDocumentRealtime } from "@/lib/firestore-hooks";
import { Membership } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { sendOrganizationInvitation, validateCustomerInvite } from "@/lib/services";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { where } from "firebase/firestore";
import { Search, Plus, AlertTriangle, Crown, Users, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const COLLECTION_TYPES = ["Daily", "Weekly", "Monthly"] as const;
type CollectionType = typeof COLLECTION_TYPES[number];

export default function OrgCustomers() {
  const { user } = useUser();
  const { organization } = useOrganization();

  const { data: customers, loading } = useCollectionRealtime<Membership>("organizationMembers", [
    where("role", "==", "CUSTOMER")
  ]);
  // Collectors: includes regular agents AND the default owner collector (role: "AGENT")
  const { data: agents, loading: agentsLoading } = useCollectionRealtime<Membership>("organizationMembers", [
    where("role", "==", "AGENT")
  ]);
  const { data: orgDoc } = useDocumentRealtime<any>("organizations", organization?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [initialDeposit, setInitialDeposit] = useState("");
  const [collectionType, setCollectionType] = useState<CollectionType>("Daily");

  const activeAgents = agents.filter((a: any) => a.status === "ACTIVE");

  // Auto-select the collector when there's exactly one (owner is default)
  useEffect(() => {
    if (isInviteOpen && activeAgents.length === 1) {
      setSelectedAgentId(activeAgents[0].id);
    }
  }, [isInviteOpen, activeAgents.length]);

  const filteredCustomers = customers.filter((u) =>
    ((u?.fullName || (u as any)?.name || "").toLowerCase().includes(searchTerm.toLowerCase())) ||
    ((u?.phone || "").includes(searchTerm)) ||
    ((u?.email || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const maxCustomers = orgDoc?.limits?.maxCustomers || 10;
  const activeCustomers = customers.filter((c: any) => c.status === "ACTIVE").length;
  const atLimit = activeCustomers >= maxCustomers;

  // Helper: is this collector the default owner collector?
  const isOwnerCollector = (a: any) => a.collector_type === "OWNER" || a.is_default === true;

  const statusClass = (status?: string) => {
    if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "INVITED") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-slate-50 text-slate-600 border-slate-100";
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setSelectedAgentId("");
    setInitialDeposit("");
    setCollectionType("Daily");
  };

  const handleInviteCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) { toast.error("No active organization selected."); return; }
    if (!user?.id) { toast.error("Missing authenticated owner identity."); return; }
    if (!fullName.trim()) { toast.error("Customer full name is required."); return; }
    if (!email.trim()) { toast.error("Email address is required."); return; }
    if (!phone.trim()) { toast.error("Phone number is required."); return; }
    if (atLimit) { toast.error(`Customer limit of ${maxCustomers} reached. Please upgrade your plan.`); return; }

    // Auto-assign when only one collector exists (owner is default); otherwise require selection
    const collectorToAssign =
      activeAgents.length === 1
        ? activeAgents[0]
        : activeAgents.find((a) => a.id === selectedAgentId);

    if (!collectorToAssign) {
      toast.error("Please select an assigned collector.");
      return;
    }

    const emailKey = email.trim().toLowerCase();

    setIsValidating(true);
    try {
      await validateCustomerInvite(organization.id, emailKey, phone.trim());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Validation failed");
      setIsValidating(false);
      return;
    } finally {
      setIsValidating(false);
    }

    setIsSubmitting(true);
    try {
      const invitedByEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
      const result = await sendOrganizationInvitation({
        organization,
        organizationId: organization.id,
        email: emailKey,
        role: "customer",
        clerkRole: "org:customer",
        invitedBy: user.id,
        invitedByEmail,
        fullName: fullName.trim(),
        phone: phone.trim(),
        assignedAgentId: collectorToAssign.id,
        assignedAgentName: collectorToAssign.fullName || (collectorToAssign as any).name || "",
        notes: [
          `Collection Type: ${collectionType}`,
          initialDeposit ? `Initial Deposit: ₹${initialDeposit}` : "",
        ].filter(Boolean).join(" | "),
      });
      toast.success(result.message);
      setIsInviteOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send customer invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manage Customers</h2>
          <p className="text-slate-500">
            View and add pigmy savings accounts.{" "}
            <span className={`font-semibold ${atLimit ? "text-red-500" : "text-slate-600"}`}>
              {activeCustomers}/{maxCustomers} active
            </span>
          </p>
        </div>

        {atLimit ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 font-medium shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Customer limit reached</span>
          </div>
        ) : (
          <Dialog open={isInviteOpen} onOpenChange={(open) => { setIsInviteOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger render={
              <Button className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Add Customer</Button>
            } />
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Add Customer</DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Add a new pigmy savings customer to your organization.
                </p>
              </DialogHeader>

              <form onSubmit={handleInviteCustomer} className="space-y-4 mt-2">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name" className="text-sm font-semibold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cust-name"
                    placeholder="e.g. Priya Devi"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="cust-email" className="text-sm font-semibold text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cust-email"
                    type="email"
                    placeholder="customer@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="cust-phone" className="text-sm font-semibold text-slate-700">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cust-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>

                {/* Assigned Collector — auto-selected if only one; dropdown if multiple */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">
                    Assigned Collector
                  </Label>
                  {agentsLoading ? (
                    <div className="h-10 rounded-md bg-slate-100 animate-pulse" />
                  ) : activeAgents.length === 0 ? (
                    <div className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center text-sm text-slate-400">
                      No active collectors
                    </div>
                  ) : activeAgents.length === 1 ? (
                    // Single collector — auto-assigned, shown as read-only badge
                    <div className="h-10 rounded-md border border-emerald-200 bg-emerald-50 px-3 flex items-center gap-2 text-sm text-emerald-800 font-medium">
                      {isOwnerCollector(activeAgents[0]) && (
                        <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      {activeAgents[0].fullName || (activeAgents[0] as any).name || "Owner"}
                      {isOwnerCollector(activeAgents[0]) && (
                        <span className="ml-auto text-xs text-emerald-600 font-normal">Auto-assigned</span>
                      )}
                    </div>
                  ) : (
                    // Multiple collectors — show dropdown
                    <div className="relative">
                      <select
                        id="cust-agent"
                        value={selectedAgentId}
                        onChange={e => setSelectedAgentId(e.target.value)}
                        className="w-full appearance-none rounded-md border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-900 h-10 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      >
                        <option value="">Select a collector…</option>
                        {activeAgents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.fullName || (agent as any).name || agent.email || agent.id}
                            {isOwnerCollector(agent) ? " (Owner · Default)" : ""}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  )}
                </div>

                {/* Collection Type */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-slate-700">Collection Schedule</Label>
                  <div className="flex gap-2">
                    {COLLECTION_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCollectionType(type)}
                        className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-all ${
                          collectionType === type
                            ? "bg-sky-50 border-sky-300 text-sky-700 shadow-sm"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Initial Deposit (optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="cust-deposit" className="text-sm font-semibold text-slate-700">
                    Initial Deposit{" "}
                    <span className="text-slate-400 text-xs font-normal">(optional)</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                    <Input
                      id="cust-deposit"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={initialDeposit}
                      onChange={e => setInitialDeposit(e.target.value)}
                      className="pl-7 h-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={isValidating || isSubmitting || agentsLoading}
                >
                  {isValidating ? "Validating…" : isSubmitting ? "Sending Invitation…" : "Add Customer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {atLimit && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Customer limit reached ({activeCustomers}/{maxCustomers})</p>
            <p className="text-xs text-amber-600 mt-0.5">Upgrade your plan to add more customers.</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold shrink-0 transition-all">
            Upgrade
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search customers…"
              className="pl-10 h-11"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned Collector</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(5)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-slate-100 rounded animate-pulse w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-8 h-8 text-slate-300" />
                        <p className="text-slate-500 text-sm font-medium">No customers yet.</p>
                        <p className="text-slate-400 text-xs">Click "Add Customer" to add your first savings member.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map(customer => {
                    const agent = agents.find(a => a.id === ((customer as any).assignedAgentId || customer.agentId));
                    return (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">
                          {customer.fullName || (customer as any).name || (
                            <span className="text-slate-400 italic text-xs">Pending setup</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600">{customer.email || "N/A"}</TableCell>
                        <TableCell className="text-slate-600">{customer.phone || <span className="text-slate-400">—</span>}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                            {isOwnerCollector(agent || {}) && <Crown className="w-3 h-3 text-amber-500" />}
                            {(customer as any).assignedAgentName || agent?.fullName || (agent as any)?.name || (
                              <span className="text-slate-400">Unassigned</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${statusClass(customer.status as string)}`}>
                            {(customer as any).status || "INVITED"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">No customers yet.</p>
                <p className="text-slate-400 text-xs mt-1">Click "Add Customer" to add your first savings member.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCustomers.map(customer => {
                  const agent = agents.find(a => a.id === ((customer as any).assignedAgentId || customer.agentId));
                  const statusCls = statusClass(customer.status as string);
                  return (
                    <div key={customer.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {customer.fullName || (customer as any).name || <span className="text-slate-400 italic">Pending setup</span>}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{customer.email || "—"} · {customer.phone || "—"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Collector: {(customer as any).assignedAgentName || agent?.fullName || "Unassigned"}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border shrink-0 ${statusCls}`}>
                        {(customer as any).status || "INVITED"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
