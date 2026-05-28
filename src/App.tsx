import React, { useEffect, useState } from "react";
import { ClerkProvider, SignedIn, useUser, useOrganization, useOrganizationList } from "@clerk/clerk-react";
import AuthSyncService from "./components/FirestoreUserSync";
import AuthRedirectManager from "./components/AuthRedirectManager";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { membershipIdFor } from "@/lib/services";
import { getDashboardPath, normalizeClerkRole } from "@/lib/auth/get-user-role";
import { useDocumentRealtime } from "@/lib/firestore-hooks";
import { Toaster } from "@/components/ui/sonner";

import LandingPage from "./pages/LandingPage";
import AuthCallbackPage from "./pages/AuthCallback";
import CompleteProfilePage from "./pages/CompleteProfilePage";
import NotFoundPage from "./pages/NotFoundPage";

import CustomSignInPage from "./pages/auth/SignInPage";
import CustomSignUpPage from "./pages/auth/SignUpPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";

import OrgDashboard from "./pages/organization/OrgDashboard";
import OwnerOnboarding from "./pages/organization/OwnerOnboarding";
import AgentDashboard from "./pages/agent/AgentDashboard";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import OrgCreate from "./pages/organization/OrgCreate";
import OrgInvitation from "./pages/organization/OrgInvitation";
import UserProfilePage from "./pages/UserProfilePage";
import WorkspaceSelectionPage from "./pages/WorkspaceSelectionPage";
import DebugUserDoc from "./components/DebugUserDoc";


const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function LoadingWorkspace({
  message = "Loading your workspace…",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        {onRetry ? (
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 mx-auto">
            <span className="text-red-500 text-lg font-bold">!</span>
          </div>
        ) : (
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600 mx-auto mb-4" />
        )}
        <p className="text-slate-500 text-sm">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <LoadingWorkspace message="Checking your session…" />;
  if (!isSignedIn) return <Navigate to="/auth/sign-in" replace />;
  return <>{children}</>;
}

function RoleProtectedRoute({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { organization } = useOrganization();
  const { isLoaded: isOrgListLoaded, userMemberships, setActive } = useOrganizationList({ userMemberships: true });
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  // Accept orgId passed via navigation state (set after fresh org creation) so we
  // can query Firestore immediately without waiting for Clerk hooks to sync.
  const navOrgId: string | null =
    (location.state as any)?.orgId ||
    sessionStorage.getItem("fc_onboarding_org_id") ||
    null;

  const activeOrgId =
    organization?.id ||
    userMemberships?.data?.[0]?.organization?.id ||
    navOrgId ||
    null;

  useEffect(() => {
    if (!isOrgListLoaded || organization?.id || !userMemberships?.data?.length || !setActive) return;
    setActive({ organization: userMemberships.data[0].organization.id }).catch(() => undefined);
  }, [isOrgListLoaded, organization?.id, userMemberships?.data, setActive]);

  const membershipId = user && activeOrgId ? membershipIdFor(activeOrgId, user.id) : null;
  const { data: membershipDoc, loading: membershipDocLoading } = useDocumentRealtime<any>("organizationMembers", membershipId);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const isLoading =
    !isLoaded ||
    (!isOrgListLoaded && !timedOut) ||
    (membershipId !== null && membershipDocLoading && !timedOut);

  if (isLoading) return <LoadingWorkspace />;
  if (!isSignedIn || !user) return <Navigate to="/auth/sign-in" replace />;

  // After timeout with a valid membershipId but still no doc from Firestore —
  // fall back to Clerk membership role so the user can still access their dashboard.
  if (!membershipDoc && timedOut && membershipId) {
    const clerkMembership = userMemberships?.data?.find(
      (m) => m.organization?.id === activeOrgId
    );
    const clerkRole = clerkMembership?.role; // "org:admin" etc.
    if (clerkRole === "org:admin" && allowedRoles.includes("organization_owner")) {
      console.warn("[RoleProtectedRoute] Firestore unavailable — granting access via Clerk role org:admin");
      return <>{children}</>;
    }
    return (
      <LoadingWorkspace
        message="Could not load workspace data. Please check your connection."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!membershipDoc) return <Navigate to="/router" replace />;

  const normalizedRole = normalizeClerkRole(membershipDoc.clerkRole || membershipDoc.role || null);
  if (!allowedRoles.includes(normalizedRole)) return <Navigate to="/router" replace />;

  return <>{children}</>;
}

function RoleRouter() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { isLoaded: isOrgListLoaded, userMemberships, userInvitations, setActive } = useOrganizationList({ userMemberships: true, userInvitations: true });
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  // Accept orgId from navigation state (fresh creation) or sessionStorage backup
  const navOrgId: string | null =
    (location.state as any)?.orgId ||
    sessionStorage.getItem("fc_onboarding_org_id") ||
    null;

  const activeOrgId =
    organization?.id ||
    userMemberships?.data?.[0]?.organization?.id ||
    navOrgId ||
    null;

  const membershipDocId = user && activeOrgId ? membershipIdFor(activeOrgId, user.id) : null;
  const { data: membershipDoc, loading: membershipDocLoading } = useDocumentRealtime<any>("organizationMembers", membershipDocId);

  useEffect(() => {
    if (!user || !isOrgListLoaded || organization?.id || !userMemberships?.data?.length || !setActive) return;
    setActive({ organization: userMemberships.data[0].organization.id }).catch(() => {});
  }, [user, isOrgListLoaded, organization?.id, userMemberships?.data, setActive]);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  console.log("[RoleRouter] orgId:", activeOrgId, "| membershipDocId:", membershipDocId, "| membershipDoc:", !!membershipDoc, "| loading:", membershipDocLoading, "| timedOut:", timedOut);

  if (!user) return <Navigate to="/auth/sign-in" replace />;

  const isLoading =
    (!isOrgListLoaded || (membershipDocId !== null && membershipDocLoading)) && !timedOut;

  if (isLoading) return <LoadingWorkspace />;

  if (membershipDoc) {
    const normalizedRole = normalizeClerkRole(membershipDoc.clerkRole || membershipDoc.role || null);
    const profileCompleted = membershipDoc.profileCompleted !== false;
    console.log("[RoleRouter] ✓ Firestore role:", normalizedRole, "| profileCompleted:", profileCompleted);
    if (!profileCompleted && (normalizedRole === "pigmy_collector" || normalizedRole === "customer")) {
      return <Navigate to="/complete-profile" replace />;
    }
    sessionStorage.removeItem("fc_onboarding_org_id");
    return <Navigate to={getDashboardPath(normalizedRole)} replace />;
  }

  // No Firestore membership doc found yet.
  // CRITICAL: If user already has Clerk org memberships, do NOT redirect to /onboarding —
  // that creates an infinite loop (onboarding immediately redirects back to /router).
  // Instead, use Clerk org role as a fallback to break the cycle.
  if (isOrgListLoaded && userMemberships?.data?.length) {
    const firstMembership = userMemberships.data[0];
    const clerkRole = firstMembership.role; // "org:admin" for org creator
    const orgId = firstMembership.organization?.id || navOrgId;
    console.log("[RoleRouter] No Firestore doc but Clerk org exists. clerkRole:", clerkRole, "orgId:", orgId);

    // org:admin = org creator = owner in FundCircle
    if (clerkRole === "org:admin" && orgId) {
      // Pass the orgId via state so RoleProtectedRoute can query Firestore
      return <Navigate to="/dashboard/owner" replace state={{ orgId }} />;
    }

    // For non-admin Clerk roles, the Firestore doc is needed for the specific role.
    // Wait up to timeout, then show error.
    if (!timedOut) return <LoadingWorkspace message="Syncing your workspace data…" />;

    return (
      <LoadingWorkspace
        message="Workspace data not found. Please try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (userInvitations?.data?.length) return <Navigate to="/organization/invitation" replace />;
  console.log("[RoleRouter] No Clerk org memberships — redirecting to onboarding");
  return <Navigate to="/onboarding" replace />;
}

export default function App() {
  if (!clerkPubKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-red-50 p-6 rounded-2xl text-red-900 border border-red-200 shadow-lg">
          <h1 className="text-lg font-bold mb-2">Clerk API Key Missing</h1>
          <p className="text-sm">Please configure VITE_CLERK_PUBLISHABLE_KEY in your environment variables.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey} fallbackRedirectUrl="/auth/callback">
      <BrowserRouter>
        <AuthRedirectManager />
        <Routes>
          {/* Landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Custom auth pages */}
          <Route path="/auth/sign-in" element={<CustomSignInPage />} />
          <Route path="/auth/sign-up" element={<CustomSignUpPage />} />
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Legacy sign-in/sign-up paths → redirect to new custom pages */}
          <Route path="/sign-in/*" element={<Navigate to="/auth/sign-in" replace />} />
          <Route path="/sign-up/*" element={<Navigate to="/auth/sign-up" replace />} />
          <Route path="/organization/signin/*" element={<Navigate to="/auth/sign-in" replace />} />
          <Route path="/organization/signup/*" element={<Navigate to="/auth/sign-up" replace />} />
          <Route path="/agent/login/*" element={<Navigate to="/auth/sign-in" replace />} />
          <Route path="/customer/signin/*" element={<Navigate to="/auth/sign-in" replace />} />

          {/* Workspace */}
          <Route path="/workspace-selection" element={<WorkspaceSelectionPage />} />

          {/* Onboarding & profile */}
          <Route path="/onboarding" element={<ProtectedRoute><OwnerOnboarding /></ProtectedRoute>} />
          <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />
          <Route path="/auth/complete-profile" element={<ProtectedRoute><CompleteProfilePage /></ProtectedRoute>} />

          {/* Org management */}
          <Route path="/organization/create" element={<SignedIn><RoleProtectedRoute allowedRoles={["organization_owner"]}><OrgCreate /></RoleProtectedRoute></SignedIn>} />
          <Route path="/organization/invitation" element={<ProtectedRoute><OrgInvitation /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
          <Route path="/router" element={<SignedIn><RoleRouter /></SignedIn>} />

          {/* Dashboards */}
          <Route path="/dashboard/owner/*" element={<SignedIn><RoleProtectedRoute allowedRoles={["organization_owner"]}><OrgDashboard /></RoleProtectedRoute></SignedIn>} />
          <Route path="/dashboard/agent/*" element={<SignedIn><RoleProtectedRoute allowedRoles={["pigmy_collector"]}><AgentDashboard /></RoleProtectedRoute></SignedIn>} />
          <Route path="/dashboard/customer/*" element={<SignedIn><RoleProtectedRoute allowedRoles={["customer"]}><CustomerDashboard /></RoleProtectedRoute></SignedIn>} />
          <Route path="/dashboard/operator/*" element={<Navigate to="/dashboard/owner" replace />} />
          <Route path="/dashboard/collector/*" element={<Navigate to="/dashboard/agent" replace />} />
          <Route path="/dashboard/*" element={<Navigate to="/router" replace />} />

          {/* Debug */}
          <Route path="/debug-user" element={<SignedIn><ProtectedRoute><DebugUserDoc /></ProtectedRoute></SignedIn>} />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <SignedIn><AuthSyncService /></SignedIn>
      <Toaster />
    </ClerkProvider>
  );
}
