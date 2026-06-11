import { AuditModule, AuditCategory } from "../types";

// ── Action → Module mapping ────────────────────────────────────────────────────
export const ACTION_MODULE: Record<string, AuditModule> = {
  ORG_CREATED: "ORGANIZATION", ORG_UPDATED: "ORGANIZATION",
  ORG_SECURITY_UPDATED: "ORGANIZATION", ORG_SETTINGS_UPDATED: "ORGANIZATION",

  AGENT_CREATED: "AGENTS", AGENT_DEACTIVATED: "AGENTS",
  AGENT_REACTIVATED: "AGENTS", AGENT_INVITED: "AGENTS",
  AGENT_REGISTERED: "AGENTS", AGENT_PROFILE_UPDATED: "AGENTS",
  AGENT_ROLE_CHANGED: "AGENTS", AGENT_REASSIGNED: "AGENTS",

  CUSTOMER_CREATED: "CUSTOMERS", CUSTOMER_STATUS_CHANGED: "CUSTOMERS",
  CUSTOMER_ACTIVATED: "CUSTOMERS", CUSTOMER_DEACTIVATED: "CUSTOMERS",
  CUSTOMER_REASSIGNED: "CUSTOMERS", CUSTOMER_PROFILE_UPDATED: "CUSTOMERS",
  CUSTOMER_TYPE_CHANGED: "CUSTOMERS",
  NOMINEE_ADDED: "CUSTOMERS", NOMINEE_UPDATED: "CUSTOMERS", NOMINEE_REMOVED: "CUSTOMERS",

  SAVINGS_COLLECTION_RECORDED: "SAVINGS", COMBINED_COLLECTION_RECORDED: "COLLECTIONS",
  SAVINGS_DEPOSIT_REVERSED: "SAVINGS",
  SAVINGS_PLAN_CREATED: "SAVINGS", SAVINGS_PLAN_UPDATED: "SAVINGS",
  SAVINGS_PLAN_DELETED: "SAVINGS", SAVINGS_ACCOUNT_OPENED: "SAVINGS",
  SAVINGS_ACCOUNT_FROZEN: "SAVINGS", SAVINGS_ACCOUNT_CLOSED: "SAVINGS",
  SAVINGS_APPLICATION_APPROVED: "SAVINGS", SAVINGS_APPLICATION_REJECTED: "SAVINGS",
  SAVINGS_AGENT_TRANSFERRED: "SAVINGS",

  LOAN_CREATED: "LOANS", LOAN_APPROVED: "LOANS", LOAN_REJECTED: "LOANS",
  LOAN_CLOSED: "LOANS", LOAN_APPLICATION_SUBMITTED: "LOANS",
  LOAN_APPLICATION_EDITED: "LOANS", LOAN_AMOUNT_MODIFIED: "LOANS",
  LOAN_DISBURSED: "LOANS", LOAN_WRITTEN_OFF: "LOANS",

  EMI_COLLECTION_RECORDED: "COLLECTIONS", COLLECTION_REVERSED: "COLLECTIONS",
  RECEIPT_REGENERATED: "COLLECTIONS",

  REPORT_GENERATED: "REPORTS", REPORT_EXPORTED: "REPORTS",
  EXCEL_EXPORTED: "REPORTS", PDF_EXPORTED: "REPORTS",

  LOGIN_SUCCESS: "AUTHENTICATION", LOGIN_FAILED: "AUTHENTICATION",
  LOGOUT: "AUTHENTICATION", PASSWORD_CHANGED: "AUTHENTICATION",
  PASSWORD_RESET: "AUTHENTICATION", SESSION_EXPIRED: "AUTHENTICATION",
};

// ── Action → Category mapping ─────────────────────────────────────────────────
export const ACTION_CATEGORY: Record<string, AuditCategory> = {
  ORG_CREATED: "CREATE", ORG_UPDATED: "UPDATE",
  ORG_SECURITY_UPDATED: "SECURITY", ORG_SETTINGS_UPDATED: "UPDATE",

  AGENT_CREATED: "CREATE", AGENT_DEACTIVATED: "DELETE",
  AGENT_REACTIVATED: "UPDATE", AGENT_INVITED: "CREATE",
  AGENT_REGISTERED: "CREATE", AGENT_PROFILE_UPDATED: "UPDATE",
  AGENT_ROLE_CHANGED: "SECURITY", AGENT_REASSIGNED: "UPDATE",

  CUSTOMER_CREATED: "CREATE", CUSTOMER_STATUS_CHANGED: "UPDATE",
  CUSTOMER_ACTIVATED: "UPDATE", CUSTOMER_DEACTIVATED: "DELETE",
  CUSTOMER_REASSIGNED: "UPDATE", CUSTOMER_PROFILE_UPDATED: "UPDATE",
  CUSTOMER_TYPE_CHANGED: "UPDATE",
  NOMINEE_ADDED: "CREATE", NOMINEE_UPDATED: "UPDATE", NOMINEE_REMOVED: "DELETE",

  SAVINGS_COLLECTION_RECORDED: "CREATE", COMBINED_COLLECTION_RECORDED: "CREATE",
  SAVINGS_DEPOSIT_REVERSED: "DELETE",
  SAVINGS_PLAN_CREATED: "CREATE", SAVINGS_PLAN_UPDATED: "UPDATE",
  SAVINGS_PLAN_DELETED: "DELETE", SAVINGS_ACCOUNT_OPENED: "CREATE",
  SAVINGS_ACCOUNT_FROZEN: "SECURITY", SAVINGS_ACCOUNT_CLOSED: "DELETE",
  SAVINGS_APPLICATION_APPROVED: "APPROVE", SAVINGS_APPLICATION_REJECTED: "REJECT",
  SAVINGS_AGENT_TRANSFERRED: "UPDATE",

  LOAN_CREATED: "CREATE", LOAN_APPROVED: "APPROVE", LOAN_REJECTED: "REJECT",
  LOAN_CLOSED: "UPDATE", LOAN_APPLICATION_SUBMITTED: "CREATE",
  LOAN_APPLICATION_EDITED: "UPDATE", LOAN_AMOUNT_MODIFIED: "UPDATE",
  LOAN_DISBURSED: "UPDATE", LOAN_WRITTEN_OFF: "DELETE",

  EMI_COLLECTION_RECORDED: "CREATE", COLLECTION_REVERSED: "DELETE",
  RECEIPT_REGENERATED: "UPDATE",

  REPORT_GENERATED: "VIEW", REPORT_EXPORTED: "EXPORT",
  EXCEL_EXPORTED: "EXPORT", PDF_EXPORTED: "EXPORT",

  LOGIN_SUCCESS: "LOGIN", LOGIN_FAILED: "SECURITY",
  LOGOUT: "LOGIN", PASSWORD_CHANGED: "SECURITY",
  PASSWORD_RESET: "SECURITY", SESSION_EXPIRED: "LOGIN",
};

// ── Action → human-readable label ─────────────────────────────────────────────
export const ACTION_LABEL: Record<string, string> = {
  ORG_CREATED: "Organization Created",
  ORG_UPDATED: "Organization Updated",
  ORG_SECURITY_UPDATED: "Security Settings Changed",
  ORG_SETTINGS_UPDATED: "Settings Updated",

  AGENT_CREATED: "Agent Added",
  AGENT_DEACTIVATED: "Agent Deactivated",
  AGENT_REACTIVATED: "Agent Reactivated",
  AGENT_INVITED: "Agent Invited",
  AGENT_REGISTERED: "Agent Registered",
  AGENT_PROFILE_UPDATED: "Agent Profile Updated",
  AGENT_ROLE_CHANGED: "Agent Role Changed",
  AGENT_REASSIGNED: "Agent Reassigned",

  CUSTOMER_CREATED: "Customer Created",
  CUSTOMER_STATUS_CHANGED: "Customer Status Changed",
  CUSTOMER_ACTIVATED: "Customer Activated",
  CUSTOMER_DEACTIVATED: "Customer Deactivated",
  CUSTOMER_REASSIGNED: "Customer Reassigned",
  CUSTOMER_PROFILE_UPDATED: "Customer Profile Updated",
  CUSTOMER_TYPE_CHANGED: "Account Type Changed",

  NOMINEE_ADDED: "Nominee Added",
  NOMINEE_UPDATED: "Nominee Updated",
  NOMINEE_REMOVED: "Nominee Removed",

  SAVINGS_COLLECTION_RECORDED: "Savings Deposit Collected",
  COMBINED_COLLECTION_RECORDED: "Combined Collection (Savings + EMI)",
  SAVINGS_DEPOSIT_REVERSED: "Savings Deposit Reversed",
  SAVINGS_PLAN_CREATED: "Savings Plan Created",
  SAVINGS_PLAN_UPDATED: "Savings Plan Updated",
  SAVINGS_PLAN_DELETED: "Savings Plan Deleted",
  SAVINGS_ACCOUNT_OPENED: "Savings Account Opened",
  SAVINGS_ACCOUNT_FROZEN: "Savings Account Frozen",
  SAVINGS_ACCOUNT_CLOSED: "Savings Account Closed",
  SAVINGS_APPLICATION_APPROVED: "Savings Application Approved",
  SAVINGS_APPLICATION_REJECTED: "Savings Application Rejected",
  SAVINGS_AGENT_TRANSFERRED: "Savings Agent Transferred",

  LOAN_CREATED: "Loan Created",
  LOAN_APPROVED: "Loan Approved",
  LOAN_REJECTED: "Loan Rejected",
  LOAN_CLOSED: "Loan Fully Repaid",
  LOAN_APPLICATION_SUBMITTED: "Loan Application Submitted",
  LOAN_APPLICATION_EDITED: "Loan Application Edited",
  LOAN_AMOUNT_MODIFIED: "Loan Amount Modified",
  LOAN_DISBURSED: "Loan Disbursed",
  LOAN_WRITTEN_OFF: "Loan Written Off",

  EMI_COLLECTION_RECORDED: "EMI Payment Collected",
  COLLECTION_REVERSED: "Collection Reversed",
  RECEIPT_REGENERATED: "Receipt Regenerated",

  REPORT_GENERATED: "Report Generated",
  REPORT_EXPORTED: "Report Exported",
  EXCEL_EXPORTED: "Excel Report Downloaded",
  PDF_EXPORTED: "PDF Report Downloaded",

  LOGIN_SUCCESS: "Login Successful",
  LOGIN_FAILED: "Login Failed",
  LOGOUT: "Logged Out",
  PASSWORD_CHANGED: "Password Changed",
  PASSWORD_RESET: "Password Reset",
  SESSION_EXPIRED: "Session Expired",
};

// ── Category → color config ───────────────────────────────────────────────────
export const CATEGORY_STYLES: Record<AuditCategory, {
  badge: string;
  border: string;
  dot: string;
  label: string;
}> = {
  CREATE:   { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", border: "border-l-emerald-400", dot: "bg-emerald-400", label: "Create" },
  UPDATE:   { badge: "bg-blue-100 text-blue-700 border-blue-200",          border: "border-l-blue-400",    dot: "bg-blue-400",    label: "Update" },
  DELETE:   { badge: "bg-red-100 text-red-700 border-red-200",             border: "border-l-red-400",     dot: "bg-red-400",     label: "Delete" },
  APPROVE:  { badge: "bg-teal-100 text-teal-700 border-teal-200",          border: "border-l-teal-400",    dot: "bg-teal-400",    label: "Approve" },
  REJECT:   { badge: "bg-orange-100 text-orange-700 border-orange-200",    border: "border-l-orange-400",  dot: "bg-orange-400",  label: "Reject" },
  LOGIN:    { badge: "bg-violet-100 text-violet-700 border-violet-200",    border: "border-l-violet-400",  dot: "bg-violet-400",  label: "Login" },
  EXPORT:   { badge: "bg-cyan-100 text-cyan-700 border-cyan-200",          border: "border-l-cyan-400",    dot: "bg-cyan-400",    label: "Export" },
  VIEW:     { badge: "bg-slate-100 text-slate-600 border-slate-200",       border: "border-l-slate-300",   dot: "bg-slate-300",   label: "View" },
  SECURITY: { badge: "bg-rose-100 text-rose-700 border-rose-200",          border: "border-l-rose-500",    dot: "bg-rose-500",    label: "Security" },
};

// ── Module → color ────────────────────────────────────────────────────────────
export const MODULE_STYLES: Record<AuditModule, string> = {
  ORGANIZATION:   "bg-indigo-50 text-indigo-600 border-indigo-100",
  CUSTOMERS:      "bg-violet-50 text-violet-600 border-violet-100",
  AGENTS:         "bg-sky-50 text-sky-600 border-sky-100",
  SAVINGS:        "bg-emerald-50 text-emerald-600 border-emerald-100",
  LOANS:          "bg-amber-50 text-amber-600 border-amber-100",
  COLLECTIONS:    "bg-teal-50 text-teal-600 border-teal-100",
  REPORTS:        "bg-cyan-50 text-cyan-600 border-cyan-100",
  AUTHENTICATION: "bg-rose-50 text-rose-600 border-rose-100",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getActionLabel(action: string): string {
  return ACTION_LABEL[action] || action.replace(/_/g, " ");
}

export function getActionModule(action: string): AuditModule {
  return ACTION_MODULE[action] || "ORGANIZATION";
}

export function getActionCategory(action: string): AuditCategory {
  return ACTION_CATEGORY[action] || "UPDATE";
}

export function captureBrowserInfo(): string {
  try {
    const ua = navigator.userAgent;
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Edge")) return "Edge";
    return "Browser";
  } catch { return "Unknown"; }
}

export function captureDeviceInfo(): string {
  try {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
    if (/Android/.test(ua)) return "Android";
    if (/Windows/.test(ua)) return "Windows";
    if (/Mac/.test(ua)) return "macOS";
    if (/Linux/.test(ua)) return "Linux";
    return "Desktop";
  } catch { return "Unknown"; }
}

export function buildDescription(action: string, params?: {
  actorName?: string;
  entityName?: string;
  amount?: number;
  receiptNo?: string;
  oldType?: string;
  newType?: string;
  reason?: string;
}): string {
  const actor = params?.actorName || "System";
  const entity = params?.entityName || "";
  const amt = params?.amount ? `₹${params.amount.toLocaleString("en-IN")}` : "";
  const receipt = params?.receiptNo ? `(${params.receiptNo})` : "";

  const templates: Record<string, string> = {
    ORG_CREATED: `${actor} created the organization`,
    ORG_UPDATED: `${actor} updated organization settings`,
    ORG_SETTINGS_UPDATED: `${actor} updated organization settings`,
    ORG_SECURITY_UPDATED: `${actor} changed security settings`,

    AGENT_CREATED: `${actor} added agent ${entity}`,
    AGENT_DEACTIVATED: `${actor} deactivated agent ${entity}`,
    AGENT_REACTIVATED: `${actor} reactivated agent ${entity}`,
    AGENT_INVITED: `${actor} invited ${entity} as an agent`,
    AGENT_PROFILE_UPDATED: `${actor} updated agent profile for ${entity}`,

    CUSTOMER_CREATED: `${actor} created customer account for ${entity}`,
    CUSTOMER_STATUS_CHANGED: `${actor} changed status for ${entity}`,
    CUSTOMER_ACTIVATED: `${actor} activated customer ${entity}`,
    CUSTOMER_DEACTIVATED: `${actor} deactivated customer ${entity}`,
    CUSTOMER_REASSIGNED: `${actor} reassigned customer ${entity} to a new agent`,
    CUSTOMER_PROFILE_UPDATED: `${actor} updated profile for ${entity}`,
    CUSTOMER_TYPE_CHANGED: `${actor} changed account type for ${entity} from ${params?.oldType || "?"} to ${params?.newType || "?"}`,

    NOMINEE_ADDED: `${actor} added nominee for ${entity}`,
    NOMINEE_UPDATED: `${actor} updated nominee for ${entity}${params?.reason ? ` — Reason: ${params.reason}` : ""}`,
    NOMINEE_REMOVED: `${actor} removed nominee for ${entity}`,

    SAVINGS_COLLECTION_RECORDED: `${actor} collected savings ${amt} from ${entity} ${receipt}`,
    COMBINED_COLLECTION_RECORDED: `${actor} collected combined savings + EMI ${amt} from ${entity} ${receipt}`,
    SAVINGS_DEPOSIT_REVERSED: `${actor} reversed savings deposit for ${entity}`,
    SAVINGS_PLAN_CREATED: `${actor} created savings plan ${entity}`,
    SAVINGS_PLAN_UPDATED: `${actor} updated savings plan ${entity}`,
    SAVINGS_PLAN_DELETED: `${actor} deleted savings plan ${entity}`,
    SAVINGS_ACCOUNT_OPENED: `Savings account opened for ${entity}`,
    SAVINGS_ACCOUNT_FROZEN: `${actor} froze savings account for ${entity}`,
    SAVINGS_ACCOUNT_CLOSED: `${actor} closed savings account for ${entity}`,
    SAVINGS_APPLICATION_APPROVED: `${actor} approved savings application for ${entity}`,
    SAVINGS_APPLICATION_REJECTED: `${actor} rejected savings application for ${entity}`,

    LOAN_CREATED: `${actor} created a loan request for ${entity}`,
    LOAN_APPROVED: `${actor} approved loan of ${amt} for ${entity}`,
    LOAN_REJECTED: `${actor} rejected loan for ${entity}`,
    LOAN_CLOSED: `Loan fully repaid by ${entity}`,
    LOAN_APPLICATION_SUBMITTED: `${entity} submitted a loan application`,
    LOAN_DISBURSED: `${actor} disbursed loan ${amt} to ${entity}`,
    LOAN_WRITTEN_OFF: `${actor} wrote off loan for ${entity}`,

    EMI_COLLECTION_RECORDED: `${actor} collected EMI ${amt} from ${entity} ${receipt}`,
    COLLECTION_REVERSED: `${actor} reversed collection for ${entity}`,
    RECEIPT_REGENERATED: `${actor} regenerated receipt ${receipt} for ${entity}`,

    REPORT_GENERATED: `${actor} generated a report`,
    REPORT_EXPORTED: `${actor} exported a report`,
    EXCEL_EXPORTED: `${actor} downloaded Excel report`,
    PDF_EXPORTED: `${actor} downloaded PDF report`,

    LOGIN_SUCCESS: `${actor} signed in successfully`,
    LOGIN_FAILED: `Failed login attempt for ${entity}`,
    LOGOUT: `${actor} signed out`,
    PASSWORD_CHANGED: `${actor} changed their password`,
    PASSWORD_RESET: `Password reset for ${entity}`,
  };

  return templates[action] || `${actor} performed ${action.replace(/_/g, " ").toLowerCase()}`;
}
