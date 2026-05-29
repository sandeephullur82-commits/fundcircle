export type ClerkOrganizationRole =
  | "org:owner"
  | "org:pigmy_collector"
  | "org:customer"
  | string
  | null;

export type AppUserRole =
  | "organization_owner"
  | "pigmy_collector"
  | "customer"
  | null;

export function normalizeClerkRole(value?: string | null): AppUserRole {
  if (!value) return null;
  const v = value.toString().trim().toLowerCase();

  // Clerk prefixed roles
  if (v === "org:owner" || v === "org:admin") return "organization_owner";
  if (v === "org:pigmy_collector" || v === "org:agent" || v === "org:collector") return "pigmy_collector";
  if (v === "org:customer") return "customer";

  // Firestore string roles (uppercase or lowercase)
  if (v === "owner" || v === "organization_owner" || v === "organization" || v === "admin") return "organization_owner";
  if (v === "pigmy_collector" || v === "agent" || v === "collector") return "pigmy_collector";
  if (v === "customer") return "customer";

  return null;
}

export function isOwnerRole(role?: string | null): boolean {
  return normalizeClerkRole(role) === "organization_owner";
}

export function isAgentRole(role?: string | null): boolean {
  return normalizeClerkRole(role) === "pigmy_collector";
}

export function isCustomerRole(role?: string | null): boolean {
  return normalizeClerkRole(role) === "customer";
}

export function getDashboardPath(role?: string | null): string {
  const normalized = normalizeClerkRole(role);
  if (normalized === "organization_owner") return "/dashboard/owner";
  if (normalized === "pigmy_collector") return "/dashboard/agent";
  if (normalized === "customer") return "/dashboard/customer";
  return "/onboarding";
}
