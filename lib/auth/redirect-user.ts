import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { membershipIdFor } from "@/lib/services";
import { getDashboardPath, normalizeClerkRole } from "./get-user-role";

export interface UserRedirectResult {
  path: string;
  profileIncomplete: boolean;
  role: string | null;
  membership: any | null;
  organizationId: string | null;
}

async function fetchMembershipForOrganization(userId: string, organizationId: string) {
  const docId = membershipIdFor(organizationId, userId);
  console.log("[FC STEP 9] fetchMembership — docId:", docId);
  const snap = await getDoc(doc(db, "organizationMembers", docId));
  if (!snap.exists()) {
    console.warn("[FC STEP 9] ✗ No membership doc at organizationMembers/" + docId);
    return null;
  }
  const data = snap.data();
  console.log("[FC STEP 9] ✓ Membership doc found:");
  console.log("[FC STEP 9]   role             :", data.clerkRole ?? data.role ?? "MISSING");
  console.log("[FC STEP 9]   status           :", data.status ?? "—");
  console.log("[FC STEP 9]   profileCompleted :", data.profileCompleted ?? "field absent");
  console.log("[FC STEP 9]   clerkUserId      :", data.clerkUserId ?? "MISSING — may block role resolution");
  console.log("[FC STEP 9]   organizationId   :", data.organizationId ?? "MISSING");
  console.log("[FC STEP 9]   email            :", data.email ?? "—");
  return data;
}

async function fetchAnyMembershipForUser(userId: string) {
  console.log("[FC STEP 9] Searching ALL orgs for userId:", userId);
  const snap = await getDocs(
    query(collection(db, "organizationMembers"), where("clerkUserId", "==", userId))
  );
  if (snap.empty) {
    console.warn("[FC STEP 9] ✗ No membership found anywhere for userId:", userId);
    return null;
  }
  const data = snap.docs[0].data();
  console.log("[FC STEP 9] ✓ Found membership in org:", data.organizationId ?? snap.docs[0].id);
  console.log("[FC STEP 9]   role:", data.clerkRole ?? data.role ?? "MISSING");
  console.log("[FC STEP 9]   status:", data.status ?? "—");
  return data;
}

export async function resolveUserRedirectTarget(
  user: any | null,
  activeOrgId?: string | null
): Promise<UserRedirectResult> {
  if (!user) {
    console.warn("[FC STEP 9] No user object — returning /auth/sign-in");
    return { path: "/auth/sign-in", profileIncomplete: false, role: null, membership: null, organizationId: null };
  }

  console.log("════════════════════════════════════════════════");
  console.log("[FC STEP 9] ▶ Role resolution");
  console.log("[FC STEP 9]   userId     :", user.id);
  console.log("[FC STEP 9]   activeOrgId:", activeOrgId ?? "null");
  console.log("════════════════════════════════════════════════");

  let membership: any = null;
  let membershipOrgId = activeOrgId || null;

  if (activeOrgId) {
    membership = await fetchMembershipForOrganization(user.id, activeOrgId);
  }

  if (!membership) {
    console.log("[FC STEP 9] No membership for active org — searching all orgs…");
    membership = await fetchAnyMembershipForUser(user.id);
    if (membership) {
      membershipOrgId = membership.organizationId || membershipOrgId;
    }
  }

  if (!membership) {
    console.warn("[FC STEP 9] ✗ No Firestore membership found anywhere — routing to /onboarding");
    return { path: "/onboarding", profileIncomplete: false, role: null, membership: null, organizationId: membershipOrgId };
  }

  const rawRole = membership.clerkRole || membership.role || null;
  const normalized = normalizeClerkRole(rawRole);
  const profileCompleted = membership.profileCompleted !== false;
  const path = profileCompleted ? getDashboardPath(rawRole) : "/complete-profile";

  console.log("[FC STEP 9] ✓ Role resolved:");
  console.log("[FC STEP 9]   rawRole         :", rawRole ?? "NULL — CRITICAL: no role stored in Firestore doc");
  console.log("[FC STEP 9]   normalizedRole  :", normalized ?? "null (UNRECOGNIZED)");
  console.log("[FC STEP 9]   profileCompleted:", profileCompleted);
  console.log("[FC STEP 10]   → destination  :", path);

  return { path, profileIncomplete: !profileCompleted, role: rawRole, membership, organizationId: membershipOrgId };
}
