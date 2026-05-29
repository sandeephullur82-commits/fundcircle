import React, { useState } from "react";
import { useCollectionRealtime, useDocumentRealtime } from "@/lib/firestore-hooks";
import { Membership } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { sendOrganizationInvitation, validateAgentInviteEmail } from "@/lib/services";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { where } from "firebase/firestore";
import { Search, Plus, AlertTriangle, UserCheck, Clock, Mail, Crown, Info } from "lucide-react";
import { toast } from "sonner";

export default function OrgAgents() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { data: members, loading } = useCollectionRealtime<Membership>("organizationMembers", [
    where("role", "==", "AGENT")
  ]);
  const { data: orgDoc } = useDocumentRealtime<any>("organizations", organization?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Owner collector is the built-in default (collector_type === "OWNER")
  const isOwnerCollector = (m: any) => m.collector_type === "OWNER" || m.is_default === true;

  const collectors = members.filter((u) =>
    ((u?.fullName || (u as any)?.name || "").toLowerCase().includes(searchTerm.toLowerCase())) ||
    ((u?.phone || "").includes(searchTerm)) ||
    ((u?.email || "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Limit counts exclude the default owner collector (it's always "free")
  const additionalCollectors = members.filter((m: any) => !isOwnerCollector(m));
  const maxCollectors = orgDoc?.limits?.maxAgents || 1;
  const activeCollectors = additionalCollectors.filter((a: any) => a.status === "ACTIVE").length;
  const invitedCollectors = additionalCollectors.filter((a: any) => a.status === "INVITED" || a.status === "PENDING").length;
  const atLimit = activeCollectors >= maxCollectors;

  const statusConfig: Record<string, { label: string; className: string }> = {
    ACTIVE:    { label: "Active",    className: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    INVITED:   { label: "Invited",   className: "bg-amber-50 text-amber-700 border-amber-100" },
    PENDING:   { label: "Pending",   className: "bg-sky-50 text-sky-700 border-sky-100" },
    SUSPENDED: { label: "Suspended", className: "bg-red-50 text-red-700 border-red-100" },
  };

  const getStatus = (m: any) => {
    if (isOwnerCollector(m)) return { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-100" };
    const key = ((m.status as string) || "INVITED").toUpperCase();
    return statusConfig[key] || { label: key, className: "bg-slate-50 text-slate-600 border-slate-100" };
  };

  const resetForm = () => setEmail("");

  const handleInviteCollector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) { toast.error("No active organization selected."); return; }
    if (!user?.id) { toast.error("Unable to send invitation without a signed-in owner."); return; }
    if (!email.trim()) { toast.error("Email address is required."); return; }
    if (atLimit) { toast.error(`Collector limit of ${maxCollectors} reached. Please upgrade your plan.`); return; }

    const emailKey = email.trim().toLowerCase();

    setIsValidating(true);
    try {
      await validateAgentInviteEmail(organization.id, emailKey);
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
        role: "pigmy_collector",
        clerkRole: "org:pigmy_collector",
        invitedBy: user.id,
        invitedByEmail,
        fullName: "",
        phone: "",
        notes: "",
        assignedArea: "",
      });
      toast.success(result.message);
      setIsInviteOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send collector invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manage Collectors</h2>
          <p className="text-slate-500">View and add pigmy collectors for your organization.</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
              <UserCheck className="w-3 h-3" />
              Active: {activeCollectors}/{maxCollectors}
            </span>
            {invitedCollectors > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1">
                <Clock className="w-3 h-3" />
                Invited: {invitedCollectors}
              </span>
            )}
          </div>
        </div>

        {atLimit ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 font-medium shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Collector limit reached</span>
          </div>
        ) : (
          <Dialog open={isInviteOpen} onOpenChange={(open) => { setIsInviteOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger render={
              <Button className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Add Collector</Button>
            } />
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">Invite Pigmy Collector</DialogTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Enter the agent's email address. They'll receive a secure invitation to join your organization.
                </p>
              </DialogHeader>

              <form onSubmit={handleInviteCollector} className="space-y-5 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="col-email" className="text-sm font-semibold text-slate-700">
                    Agent Email Address <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="col-email"
                      type="email"
                      placeholder="agent@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10 h-11"
                      required
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-xs text-slate-400">Role is automatically assigned as Pigmy Collector.</p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={isValidating || isSubmitting || !email.trim()}
                >
                  {isValidating ? "Validating…" : isSubmitting ? "Sending Invitation…" : "Send Invitation"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Info banner: owner is always the first collector */}
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sky-800">You are the default collector</p>
          <p className="text-xs text-sky-600 mt-0.5">
            As the organization owner, you automatically act as the first Pigmy Collector. You can create customers and collect savings immediately. Additional collectors are optional.
          </p>
        </div>
      </div>

      {atLimit && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">Collector limit reached ({activeCollectors}/{maxCollectors})</p>
            <p className="text-xs text-amber-600 mt-0.5">Upgrade your plan to add more pigmy collectors.</p>
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
              placeholder="Search collectors…"
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
                  <TableHead>Collector</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned Area</TableHead>
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
                ) : collectors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <UserCheck className="w-8 h-8 text-slate-300" />
                        <p className="text-slate-500 text-sm font-medium">No additional collectors yet.</p>
                        <p className="text-slate-400 text-xs">You are the default collector. Invite more collectors to scale your operations.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  collectors.map(collector => {
                    const s = getStatus(collector);
                    const isDefault = isOwnerCollector(collector);
                    return (
                      <TableRow key={collector.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {collector.fullName || (collector as any).name || (
                                <span className="text-slate-400 italic text-xs">Pending setup</span>
                              )}
                            </span>
                            {isDefault && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                <Crown className="w-2.5 h-2.5" /> Owner · Default
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{collector.email || <span className="text-slate-400">—</span>}</TableCell>
                        <TableCell className="text-slate-600">{collector.phone || <span className="text-slate-400">—</span>}</TableCell>
                        <TableCell>{(collector as any).assignedArea || <span className="text-slate-400 text-xs">All Areas</span>}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${s.className}`}>
                            {s.label}
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
                  <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : collectors.length === 0 ? (
              <div className="py-12 text-center">
                <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">No additional collectors yet.</p>
                <p className="text-slate-400 text-xs mt-1">You are the default collector. Click "Add Collector" to invite more.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {collectors.map(collector => {
                  const s = getStatus(collector);
                  const isDefault = isOwnerCollector(collector);
                  return (
                    <div key={collector.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-slate-900 text-sm truncate">
                            {collector.fullName || (collector as any).name || <span className="text-slate-400 italic">Pending setup</span>}
                          </p>
                          {isDefault && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 shrink-0">
                              <Crown className="w-2 h-2" /> Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{collector.email || "—"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {collector.phone || "—"} · {(collector as any).assignedArea || "All Areas"}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border shrink-0 ${s.className}`}>
                        {s.label}
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
