import { FormEvent, useEffect, useMemo, useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useUser, useOrganization, useOrganizationList } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, UserCheck } from "lucide-react";
import { useDocumentRealtime } from "@/lib/firestore-hooks";
import { db } from "@/lib/firebase";
import { membershipIdFor } from "@/lib/services";
import { normalizeClerkRole, getDashboardPath, isAgentRole, isCustomerRole } from "@/lib/auth/get-user-role";
import AuthLayout from "@/src/pages/auth/AuthLayout";

export default function CompleteProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { organization } = useOrganization();
  const { isLoaded: orgListLoaded, userMemberships, setActive } = useOrganizationList({ userMemberships: true });
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedArea, setAssignedArea] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const activeOrgId = organization?.id || userMemberships?.data?.[0]?.organization?.id || null;
  const membershipId = user && activeOrgId ? membershipIdFor(activeOrgId, user.id) : null;
  const { data: membershipDoc, loading: membershipLoading } = useDocumentRealtime<any>("organizationMembers", membershipId);

  const role = useMemo(() => {
    return normalizeClerkRole(membershipDoc?.clerkRole || membershipDoc?.role || null);
  }, [membershipDoc]);

  useEffect(() => {
    if (!isLoaded || !orgListLoaded) return;
    if (!organization?.id && userMemberships?.data?.length && setActive) {
      setActive({ organization: userMemberships.data[0].organization.id }).catch(() => undefined);
    }
  }, [organization?.id, userMemberships?.data, setActive, isLoaded, orgListLoaded]);

  useEffect(() => {
    if (!membershipDoc) return;
    if (membershipDoc.profileCompleted !== false) {
      navigate("/router", { replace: true });
      return;
    }
    setFullName(membershipDoc.fullName || user?.fullName || "");
    setPhone(membershipDoc.phone || "");
    setAssignedArea(membershipDoc.assignedArea || membershipDoc.address || "");
  }, [membershipDoc, navigate, user?.fullName]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) {
      navigate("/auth/sign-in", { replace: true });
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  const userRoleLabel = isAgentRole(role) ? "Assigned Area" : isCustomerRole(role) ? "Address" : "Profile Field";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !membershipId || !membershipDoc) return;
    const cleanedPhone = phone.replace(/\D/g, "");
    if (cleanedPhone.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }
    setIsSaving(true);

    const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || "";
    const profileValues = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      assignedArea: assignedArea.trim(),
      address: assignedArea.trim(),
      profileCompleted: true,
      status: "ACTIVE",
      updatedAt: serverTimestamp(),
    } as any;

    try {
      await setDoc(doc(db, "organizationMembers", membershipId), profileValues, { merge: true });
      await setDoc(doc(db, "memberships", membershipId), profileValues, { merge: true });

      if (isCustomerRole(role)) {
        await setDoc(doc(db, "customers", membershipId), {
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: assignedArea.trim(),
          profileCompleted: true,
          status: "ACTIVE",
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      await setDoc(doc(db, "users", user.id), {
        clerkUserId: user.id,
        id: user.id,
        email,
        name: fullName.trim() || user.fullName || "",
        role: isAgentRole(role) ? "pigmy_collector" : isCustomerRole(role) ? "customer" : "customer",
        phone: phone.trim(),
        assignedArea: assignedArea.trim(),
        address: assignedArea.trim(),
        status: "ACTIVE",
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success("Profile completed successfully.");
      navigate(getDashboardPath(role), { replace: true });
    } catch (error: any) {
      console.error("CompleteProfilePage save error:", error);
      toast.error(error?.message || "Failed to complete profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || !orgListLoaded || membershipLoading) {
    return (
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 className="h-7 w-7 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!membershipDoc) {
    return (
      <AuthLayout>
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-2xl shadow-2xl shadow-black/50 text-center">
          <p className="text-white font-semibold mb-2">No active membership found</p>
          <p className="text-sm text-white/45 mb-6">Your account does not appear to have an active organization membership yet.</p>
          <button
            onClick={() => navigate("/router", { replace: true })}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Return to app
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-2xl shadow-2xl shadow-black/50">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-600/25 to-blue-600/25">
            <UserCheck className="h-6 w-6 text-violet-400" />
          </div>
          <h2 className="text-[1.6rem] font-bold text-white leading-tight">Complete your profile</h2>
          <p className="mt-1.5 text-sm text-white/45">Finish your account setup to access your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Full name
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              autoFocus
              className="w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-violet-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              Phone number
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").substring(0, 10))}
              placeholder="10-digit mobile number"
              required
              className="w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-violet-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-violet-500/20"
            />
            <p className="text-[11px] text-white/30">Enter 10-digit Indian mobile number</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-white/45">
              {userRoleLabel}
            </label>
            <textarea
              value={assignedArea}
              onChange={(e) => setAssignedArea(e.target.value)}
              placeholder={isAgentRole(role) ? "Enter your assigned collection zone" : "Enter your address"}
              required
              rows={3}
              className="w-full rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-violet-500/60 focus:bg-white/[0.09] focus:ring-2 focus:ring-violet-500/20 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:from-violet-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving profile…
              </>
            ) : (
              "Complete profile"
            )}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
