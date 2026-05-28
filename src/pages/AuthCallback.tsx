import { useEffect, useState } from "react";
import { useUser, useOrganization, useOrganizationList } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { resolveUserRedirectTarget } from "@/lib/auth/redirect-user";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { organization } = useOrganization();
  const { isLoaded: orgListLoaded, setActive, userMemberships, userInvitations } = useOrganizationList({ userMemberships: true, userInvitations: true });
  const navigate = useNavigate();
  const [status, setStatus] = useState("Checking your session…");

  useEffect(() => {
    if (!isLoaded || !orgListLoaded) return;

    const performRedirect = async () => {
      if (!isSignedIn || !user) {
        navigate("/auth/sign-in", { replace: true });
        return;
      }

      setStatus("Preparing your workspace…");

      try {
        if (!organization?.id && userMemberships?.data?.length && setActive) {
          await setActive({ organization: userMemberships.data[0].organization.id });
        }

        const activeOrgId = organization?.id || userMemberships?.data?.[0]?.organization?.id || null;
        const redirect = await resolveUserRedirectTarget(user, activeOrgId);

        if (!redirect.membership) {
          if (userInvitations?.data?.length) {
            navigate("/organization/invitation", { replace: true });
            return;
          }
          navigate("/onboarding", { replace: true });
          return;
        }

        if (redirect.organizationId && setActive && organization?.id !== redirect.organizationId) {
          try {
            await setActive({ organization: redirect.organizationId });
          } catch {
          }
        }

        navigate(redirect.path, { replace: true });
      } catch (error: any) {
        console.error("Auth callback failed:", error);
        toast.error(error?.message || "Unable to finish authentication.");
        navigate("/auth/sign-in", { replace: true });
      }
    };

    performRedirect();
  }, [isLoaded, isSignedIn, user, orgListLoaded, organization?.id, setActive, userMemberships?.data, userInvitations?.data, navigate]);

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4 relative overflow-x-hidden">
      <div className="pointer-events-none absolute -top-48 -left-40 h-[650px] w-[650px] rounded-full bg-violet-700/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-40 h-[550px] w-[550px] rounded-full bg-blue-600/18 blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3 mb-2">
          <img
            src="/fundcircle-logo.png"
            alt="FundCircle"
            className="h-12 w-12 rounded-2xl object-cover object-top shadow-2xl shadow-violet-900/60 ring-1 ring-white/10"
          />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">FundCircle</h1>
            <p className="text-[11px] text-white/35 font-medium tracking-[0.15em] uppercase mt-0.5">Micro-Savings Platform</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] px-10 py-8 backdrop-blur-2xl shadow-2xl shadow-black/50 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
          <p className="text-sm font-medium text-white/50">{status}</p>
        </div>
      </div>
    </div>
  );
}
