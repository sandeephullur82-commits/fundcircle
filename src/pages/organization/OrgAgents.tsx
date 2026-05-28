import React, { useState } from "react";
import { useCollectionRealtime, useDocumentRealtime } from "@/lib/firestore-hooks";
import { Membership } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { sendOrganizationInvitation } from "@/lib/services";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { where } from "firebase/firestore";
import { Search, Plus, AlertTriangle, ArrowRight } from "lucide-react";
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
  const [assignedArea, setAssignedArea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const agents = members.filter((u) =>
    (((u?.fullName || u?.name || "").toLowerCase().includes((searchTerm || "").toLowerCase())) ||
     (u?.phone || "").includes(searchTerm || "") ||
     (u?.email || "").toLowerCase().includes((searchTerm || "").toLowerCase()))
  );

  const maxAgents = orgDoc?.limits?.maxAgents || 1;
  const activeAgents = members.filter((a: any) => a.status === "ACTIVE").length || 0;
  const atLimit = activeAgents >= maxAgents;

  const statusClass = (status?: string) => {
    if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (status === "INVITED") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-slate-50 text-slate-600 border-slate-100";
  };

  const handleInviteAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) { toast.error("No active organization selected. Refresh and try again."); return; }
    if (!user?.id) { toast.error("Unable to send invitation without a signed-in owner."); return; }
    if (!email.trim()) { toast.error("Email address is required."); return; }
    if (atLimit) { toast.error(`You've reached the limit of ${maxAgents} agents for your plan. Please upgrade.`); return; }

    setIsSubmitting(true);
    try {
      const invitedByEmail = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
      const result = await sendOrganizationInvitation({
        organization,
        organizationId: organization.id,
        email: email.trim().toLowerCase(),
        role: "pigmy_collector",
        clerkRole: "org:pigmy_collector",
        invitedBy: user.id,
        invitedByEmail,
        assignedArea: assignedArea.trim(),
      });
      toast.success(result.message);
      setIsInviteOpen(false);
      setEmail("");
      setAssignedArea("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to send agent invitation";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Manage Agents</h2>
          <p className="text-slate-500">
            View and add collection agents.
            <span className={`ml-2 font-semibold ${atLimit ? "text-red-500" : "text-slate-600"}`}>
              {activeAgents}/{maxAgents} active
            </span>
          </p>
        </div>

        {atLimit ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 font-medium shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Agent limit reached</span>
          </div>
        ) : (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger render={
              <Button className="shrink-0"><Plus className="w-4 h-4 mr-2" /> Invite Agent</Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Pigmy Collector</DialogTitle>
                <p className="text-sm text-slate-500 mt-2">Send an organization invitation to a pigmy collector.</p>
              </DialogHeader>
              <form onSubmit={handleInviteAgent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="collector@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Assigned Area (Optional)</Label>
                  <Input id="area" placeholder="e.g., Northeast District" value={assignedArea} onChange={e => setAssignedArea(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending…" : "Send Invitation"}
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
            <p className="text-sm font-semibold text-amber-800">You've reached your agent limit ({activeAgents}/{maxAgents})</p>
            <p className="text-xs text-amber-600 mt-0.5">Upgrade your plan to add more pigmy collectors.</p>
          </div>
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-xs font-bold shrink-0 transition-all"
          >
            Upgrade <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input placeholder="Search agents by name or email..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned Area</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading…</TableCell></TableRow>
                ) : agents.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">No agents found.</TableCell></TableRow>
                ) : (
                  agents.map(agent => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.fullName || agent.name || "Unnamed Agent"}</TableCell>
                      <TableCell>{agent.phone || "N/A"}</TableCell>
                      <TableCell>{agent.email || "N/A"}</TableCell>
                      <TableCell>{agent.assignedArea || "Unassigned"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${statusClass(agent.status)}`}>
                          {agent.status || "INVITED"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
