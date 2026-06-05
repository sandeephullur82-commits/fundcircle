import { useEffect, useRef, useState } from "react";
import { useUser, useOrganization, useOrganizationList } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { resolveUserRedirectTarget } from "@/lib/auth/redirect-user";
import { membershipIdFor } from "@/lib/services";
import { normalizeClerkRole, getDashboardPath } from "@/lib/auth/get-user-role";
import { Loader2 } from "lucide-react";

const CALLBACK_TIMEOUT_MS = 5000;

async function runDiagnostics(
  user: any,
  activeOrgId: string | null,
  clerkMemberships: any[]
) {
  console.log("════════════════════════════════════════════");
  console.log("[FC AuthCallback Diagnostics] START");
  console.log("════════════════════════════════════════════");

  console.group("[FC Diag] 1. Clerk user");
  console.log("  id           :", user?.id ?? "MISSING");
  console.log("  email        :", user?.primaryEmailAddress?.emailAddress ?? "MISSING");
  const emailVerified = user?.primaryEmailAddress?.verification?.status === "verified";
  console.log("  emailVerified:", emailVerified ? "✓ yes" : "✗ NO — user exists in Clerk but email not verified");
  console.log("  createdAt    :", user?.createdAt ?? "—");
  console.groupEnd();

  console.group("[FC Diag] 2. Clerk org memberships");
  console.log("  count        :", clerkMemberships.length);
  clerkMemberships.forEach((m, i) => {
    console.log(`  [${i}] orgId: ${m.organization?.id} | role: ${m.role}`);
  });
  console.log("  activeOrgId  :", activeOrgId ?? "null — new user, no org yet (expected for fresh signup)");
  console.groupEnd();

  console.group("[FC Diag] 3. Firestore membership");
  if (user?.id && activeOrgId) {
    const docId = membershipIdFor(activeOrgId, user.id);
    console.log("  looking up   : organizationMembers/" + docId);
    try {
      const snap = await getDoc(doc(db, "organizationMembers", docId));
      if (snap.exists()) {
        const d = snap.data();
        console.log("  exists       : ✓ yes");
        console.log("  role         :", d.clerkRole ?? d.role ?? "MISSING");
        console.log("  status       :", d.status ?? "—");
        console.log("  profileCompleted:", d.profileCompleted ?? "field absent");
      } else {
        console.warn("  exists       : ✗ NOT FOUND at organizationMembers/" + docId);
      }
    } catch (err) {
      console.error("  Firestore read error:", err);
    }
  } else if (!user?.id) {
    console.warn("  Skipped — no userId");
  } else {
    console.log("  Skipped — no activeOrgId (expected for fresh signup, will route to /onboarding)");
  }
  console.groupEnd();

  console.log("════════════════════════════════════════════");
  console.log("[FC AuthCallback Diagnostics] END");
  console.log("════════════════════════════════════════════");
}

export default function AuthCallbackPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { organization } = useOrganization();
  const { isLoaded: orgListLoaded, setActive, userMemberships } =
    useOrganizationList({ userMemberships: true });
  const navigate = useNavigate();
  const [status, setStatus] = useState("Checking your session…");
  const [timedOut, setTimedOut] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!redirectedRef.current) {
        console.warn("[FC AuthCallback] Timeout reached (5s) — falling back to /router");
        setTimedOut(true);
      }
    }, CALLBACK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!timedOut || redirectedRef.current) return;
    redirectedRef.current = true;
    toast.error("Taking longer than expected. Retrying…");
    navigate("/router", { replace: true });
  }, [timedOut, navigate]);

  useEffect(() => {
    // ── Log entry-point state on every render so we can see exactly what
    // values Clerk has propagated at each render cycle.
    console.log(
      "[FC AuthCallback] render —",
      "isLoaded:", isLoaded,
      "| isSignedIn:", isSignedIn,
      "| orgListLoaded:", orgListLoaded,
      "| userId:", user?.id ?? "null",
      "| memberships:", userMemberships?.data?.length ?? "?",
      "| activeOrg:", organization?.id ?? "null",
      "| redirected:", redirectedRef.current
    );

    // ── Wait for Clerk to fully propagate ────────────────────────────────────
    // setActive() activates the session in Clerk's internals, but the React
    // context (isSignedIn / user) updates one render cycle later.
    // Without this guard, performRedirect() fires on the intermediate render
    // where isLoaded=true + orgListLoaded=true but isSignedIn=false.
    if (!isLoaded || !orgListLoaded) {
      console.log("[FC AuthCallback] ⏳ Waiting — isLoaded:", isLoaded, "orgListLoaded:", orgListLoaded);
      return;
    }
    if (!isSignedIn || !user) {
      console.log("[FC AuthCallback] ⏳ Waiting — session not yet propagated (isSignedIn:", isSignedIn, ")");
      return;
    }
    if (redirectedRef.current) {
      console.log("[FC AuthCallback] Already redirected — skipping");
      return;
    }

    const performRedirect = async () => {
      if (!user) return;

      setStatus("Verifying your account…");
      console.log("════════════════════════════════════════════════");
      console.log("[FC AuthCallback] ▶ performRedirect()");
      console.log("[FC AuthCallback]   userId      :", user.id);
      console.log("[FC AuthCallback]   email       :", user.primaryEmailAddress?.emailAddress ?? "—");
      console.log("[FC AuthCallback]   isSignedIn  :", isSignedIn);
      console.log("[FC AuthCallback]   activeOrg   :", organization?.id ?? "null");
      console.log("[FC AuthCallback]   memberships :", userMemberships?.data?.length ?? 0);
      console.log("════════════════════════════════════════════════");

      try {
        const memberships = userMemberships?.data ?? [];

        // ── Multi-org non-owner: send to org selector ─────────────────────
        const isMultiOrgNonOwner =
          !organization?.id &&
          memberships.length > 1 &&
          memberships[0]?.role !== "org:admin" &&
          memberships[0]?.role !== "org:owner";

        console.log("[FC AuthCallback] isMultiOrgNonOwner:", isMultiOrgNonOwner);

        if (isMultiOrgNonOwner) {
          console.log("[FC AuthCallback] → /org-select (multi-org non-owner)");
          redirectedRef.current = true;
          navigate("/org-select", { replace: true });
          return;
        }

        // ── Activate first org if none active ─────────────────────────────
        if (!organization?.id && memberships.length && setActive) {
          const firstOrgId = memberships[0].organization.id;
          setStatus("Activating your organisation…");
          console.log("[FC AuthCallback] Activating first org:", firstOrgId);
          await setActive({ organization: firstOrgId });
          console.log("[FC AuthCallback] ✓ setActive({ organization }) complete");
        } else if (!memberships.length) {
          console.log("[FC AuthCallback] No Clerk memberships — new user, skipping setActive (will route to /onboarding)");
        }

        const activeOrgId =
          organization?.id ||
          userMemberships?.data?.[0]?.organization?.id ||
          null;

        console.log("[FC AuthCallback] activeOrgId (resolved):", activeOrgId ?? "null");

        setStatus("Preparing your workspace…");
        await runDiagnostics(user, activeOrgId, memberships);

        console.log("[FC AuthCallback] ▶ resolveUserRedirectTarget(userId:", user.id, ", activeOrgId:", activeOrgId ?? "null", ")");
        const redirect = await resolveUserRedirectTarget(user, activeOrgId);
        console.log("[FC AuthCallback] ✓ resolveUserRedirectTarget() returned:");
        console.log("[FC AuthCallback]   path            :", redirect.path);
        console.log("[FC AuthCallback]   membership      :", redirect.membership ? "found" : "null (new user)");
        console.log("[FC AuthCallback]   role            :", redirect.role ?? "null");
        console.log("[FC AuthCallback]   organizationId  :", redirect.organizationId ?? "null");
        console.log("[FC AuthCallback]   profileIncomplete:", redirect.profileIncomplete);

        if (redirectedRef.current) {
          console.log("[FC AuthCallback] Already redirected during async — aborting");
          return;
        }
        redirectedRef.current = true;

        // ── No Firestore membership ────────────────────────────────────────
        if (!redirect.membership) {
          if (memberships.length && activeOrgId) {
            // Clerk org exists but Firestore doc is missing → use Clerk role fallback
            const clerkRole = memberships[0].role;
            const normalized = normalizeClerkRole(clerkRole);
            const fallbackPath = getDashboardPath(normalized);
            console.warn(
              "[FC AuthCallback] No Firestore doc but Clerk org exists — role fallback:",
              clerkRole, "→", fallbackPath
            );
            navigate(fallbackPath, { replace: true });
            return;
          }
          // Brand new user — no org, no Firestore doc → onboarding
          console.log("[FC AuthCallback] → /onboarding (new user, no Firestore membership, no Clerk org)");
          navigate("/onboarding", { replace: true });
          return;
        }

        // ── Ensure correct org is active before navigating ────────────────
        if (redirect.organizationId && setActive && organization?.id !== redirect.organizationId) {
          console.log("[FC AuthCallback] Activating org from redirect result:", redirect.organizationId);
          try { await setActive({ organization: redirect.organizationId }); } catch (e) {
            console.warn("[FC AuthCallback] setActive() for redirect org failed (non-fatal):", e);
          }
        }

        console.log("[FC AuthCallback] → navigating to:", redirect.path);
        navigate(redirect.path, { replace: true });

      } catch (error: any) {
        console.error("[FC AuthCallback] ✗ performRedirect() error:", error);
        if (redirectedRef.current) return;
        redirectedRef.current = true;
        toast.error(error?.message ?? "Unable to finish authentication.");
        navigate("/router", { replace: true });
      }
    };

    performRedirect();
  }, [
    isLoaded, isSignedIn, user,
    orgListLoaded, organization?.id,
    setActive,
    userMemberships?.data,
    navigate,
  ]);

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
