import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { membershipIdFor, reconcilePendingInviteMembership } from "@/lib/services";
import { getDashboardPath, normalizeClerkRole } from "./get-user-role";

export interface UserRedirectResult {
  path: string;
  profileIncomplete: boolean;
  role: string | null;
  membership: any | null;
  organizationId: string | null;
}

async function fetchMembershipForOrganization(userId: string, organizationId: string) {
  console.log("[FC redirect-user] fetchMembershipForOrganization — userId:", userId, "orgId:", organizationId);
  const membershipDoc = await getDoc(doc(db, "organizationMembers", membershipIdFor(organizationId, userId)));
  if (!membershipDoc.exists()) {
    console.log("[FC redirect-user] No membership doc found for:", membershipIdFor(organizationId, userId));
    return null;
  }
  return membershipDoc.data();
}

async function fetchAnyMembershipForUser(userId: string) {
  console.log("[FC redirect-user] fetchAnyMembershipForUser — userId:", userId);
  const membershipQuery = query(
    collection(db, "organizationMembers"),
    where("clerkUserId", "==", userId)
  );
  const snapshot = await getDocs(membershipQuery);
  if (snapshot.empty) {
    console.log("[FC redirect-user] No membership found for user:", userId);
    return null;
  }
  console.log("[FC redirect-user] Found membership doc:", snapshot.docs[0].id);
  return snapshot.docs[0].data();
}

export async function resolveUserRedirectTarget(
  user: any | null,
  activeOrgId?: string | null
): Promise<UserRedirectResult> {
  if (!user) {
    console.log("[FC redirect-user] No user — returning /auth/sign-in");
    return {
      path: "/auth/sign-in",
      profileIncomplete: false,
      role: null,
      membership: null,
      organizationId: null,
    };
  }

  const email = user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() || "";
  const fullName = user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim();
  console.log("[FC redirect-user] Resolving for user:", user.id, "| email:", email, "| activeOrgId:", activeOrgId);

  if (email && activeOrgId) {
    try {
      console.log("[FC redirect-user] Reconciling pending invite for org:", activeOrgId);
      await reconcilePendingInviteMembership(email, activeOrgId, user.id, fullName);
    } catch (error) {
      console.error("[FC redirect-user] Pending invite reconciliation failed:", error);
    }
  }

  let membership = null;
  let membershipOrgId = activeOrgId || null;

  if (activeOrgId) {
    membership = await fetchMembershipForOrganization(user.id, activeOrgId);
  }

  if (!membership) {
    console.log("[FC redirect-user] No membership for active org — searching all orgs for user");
    membership = await fetchAnyMembershipForUser(user.id);
    if (membership) {
      membershipOrgId = membership.organizationId || membershipOrgId;
      console.log("[FC redirect-user] Found membership in org:", membershipOrgId);
    }
  }

  if (!membership) {
    console.log("[FC redirect-user] No membership found at all — routing to /organization/invitation");
    return {
      path: "/organization/invitation",
      profileIncomplete: false,
      role: null,
      membership: null,
      organizationId: membershipOrgId,
    };
  }

  const role = membership.clerkRole || membership.role || null;
  const normalized = normalizeClerkRole(role);
  const profileCompleted = membership.profileCompleted !== false;
  const path = profileCompleted ? getDashboardPath(role) : "/complete-profile";

  console.log("[FC redirect-user] Resolved — role:", role, "| normalized:", normalized, "| path:", path, "| profileCompleted:", profileCompleted);

  return {
    path,
    profileIncomplete: !profileCompleted,
    role,
    membership,
    organizationId: membershipOrgId,
  };
}
