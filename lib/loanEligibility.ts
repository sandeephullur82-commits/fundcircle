import {
  collection, query, where, getDocs, limit,
} from "firebase/firestore";
import { db } from "./firebase";

export interface EligibilityCheck {
  id: string;
  label: string;
  description: string;
  status: "PASS" | "FAIL" | "WARN" | "LOADING" | "SKIP";
  detail?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  checks: EligibilityCheck[];
  blockers: string[];
  warnings: string[];
}

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

function monthsDiff(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export async function checkLoanEligibility(params: {
  customerId: string;
  organizationId: string;
  customerCreatedAt?: any;
  minAccountAgeMonths?: number;
  minSavingsBalance?: number;
}): Promise<EligibilityResult> {
  const {
    customerId,
    organizationId,
    customerCreatedAt,
    minAccountAgeMonths = 1,
    minSavingsBalance = 0,
  } = params;

  const checks: EligibilityCheck[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  // ── 1. No active loan ──────────────────────────────────────────────────────
  try {
    const activeStatuses = ["ACTIVE", "OVERDUE", "PARTIALLY_PAID"];
    const loanQ = query(
      collection(db, "loans"),
      where("customerId", "==", customerId),
      where("organizationId", "==", organizationId),
      limit(20)
    );
    const loanSnap = await getDocs(loanQ);
    const hasActiveLoan = loanSnap.docs.some((d) =>
      activeStatuses.includes((d.data().status || "").toUpperCase())
    );

    if (hasActiveLoan) {
      checks.push({
        id: "no_active_loan",
        label: "No Active Loan",
        description: "Customer must not have an existing active loan",
        status: "FAIL",
        detail: "Customer already has an active loan. It must be fully repaid first.",
      });
      blockers.push("Customer has an active loan");
    } else {
      checks.push({
        id: "no_active_loan",
        label: "No Active Loan",
        description: "Customer must not have an existing active loan",
        status: "PASS",
        detail: "No active loans found.",
      });
    }
  } catch {
    checks.push({
      id: "no_active_loan",
      label: "No Active Loan",
      description: "Customer must not have an existing active loan",
      status: "WARN",
      detail: "Could not verify — proceed with caution.",
    });
    warnings.push("Could not verify active loan status");
  }

  // ── 2. No overdue EMI ──────────────────────────────────────────────────────
  try {
    const overdueQ = query(
      collection(db, "loan_installments"),
      where("customerId", "==", customerId),
      where("organizationId", "==", organizationId),
      where("status", "==", "OVERDUE"),
      limit(1)
    );
    const overdueSnap = await getDocs(overdueQ);
    const hasOverdue = !overdueSnap.empty;

    if (hasOverdue) {
      checks.push({
        id: "no_overdue_emi",
        label: "No Overdue EMI",
        description: "All previous installments must be paid on time",
        status: "FAIL",
        detail: "Customer has overdue EMI installments that must be cleared first.",
      });
      blockers.push("Customer has overdue EMI installments");
    } else {
      checks.push({
        id: "no_overdue_emi",
        label: "No Overdue EMI",
        description: "All previous installments must be paid on time",
        status: "PASS",
        detail: "No overdue installments found.",
      });
    }
  } catch {
    checks.push({
      id: "no_overdue_emi",
      label: "No Overdue EMI",
      description: "All previous installments must be paid on time",
      status: "WARN",
      detail: "Could not verify — proceed with caution.",
    });
    warnings.push("Could not verify overdue EMI status");
  }

  // ── 3. Minimum account age ─────────────────────────────────────────────────
  if (customerCreatedAt) {
    const createdDate = toDate(customerCreatedAt);
    const now = new Date();
    const ageMonths = monthsDiff(createdDate, now);
    const passed = ageMonths >= minAccountAgeMonths;

    checks.push({
      id: "account_age",
      label: "Account Age",
      description: `Account must be at least ${minAccountAgeMonths} month(s) old`,
      status: passed ? "PASS" : "WARN",
      detail: passed
        ? `Account is ${ageMonths} month(s) old.`
        : `Account is only ${ageMonths} month(s) old (min: ${minAccountAgeMonths}).`,
    });
    if (!passed) warnings.push(`Account age is less than ${minAccountAgeMonths} month(s)`);
  } else {
    checks.push({
      id: "account_age",
      label: "Account Age",
      description: `Account must be at least ${minAccountAgeMonths} month(s) old`,
      status: "SKIP",
      detail: "Account creation date not available.",
    });
  }

  // ── 4. Minimum savings balance ─────────────────────────────────────────────
  if (minSavingsBalance > 0) {
    try {
      const savQ = query(
        collection(db, "savings_accounts"),
        where("customerId", "==", customerId),
        where("organizationId", "==", organizationId),
        limit(1)
      );
      const savSnap = await getDocs(savQ);
      if (savSnap.empty) {
        checks.push({
          id: "savings_balance",
          label: "Savings Balance",
          description: `Minimum savings balance of ₹${minSavingsBalance.toLocaleString()} required`,
          status: "WARN",
          detail: "No savings account found.",
        });
        warnings.push("No savings account found");
      } else {
        const balance = savSnap.docs[0].data().totalBalance || 0;
        const passed = balance >= minSavingsBalance;
        checks.push({
          id: "savings_balance",
          label: "Savings Balance",
          description: `Minimum savings balance of ₹${minSavingsBalance.toLocaleString()} required`,
          status: passed ? "PASS" : "WARN",
          detail: `Current balance: ₹${Number(balance).toLocaleString()}${!passed ? ` (min: ₹${minSavingsBalance.toLocaleString()})` : ""}`,
        });
        if (!passed) warnings.push(`Savings balance below minimum (₹${balance.toLocaleString()} < ₹${minSavingsBalance.toLocaleString()})`);
      }
    } catch {
      checks.push({
        id: "savings_balance",
        label: "Savings Balance",
        description: `Minimum savings balance of ₹${minSavingsBalance.toLocaleString()} required`,
        status: "WARN",
        detail: "Could not verify savings balance.",
      });
    }
  } else {
    checks.push({
      id: "savings_balance",
      label: "Savings Balance",
      description: "Savings balance check",
      status: "SKIP",
      detail: "No minimum savings balance configured.",
    });
  }

  const eligible = blockers.length === 0;
  return { eligible, checks, blockers, warnings };
}
