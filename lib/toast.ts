import { toast } from "sonner"

function fmt(n: number) {
  return `₹${Number(n).toLocaleString("en-IN")}`
}

// ── Customer toasts ───────────────────────────────────────────────────────────

export const fcToast = {
  customerCreated(name: string, agentName?: string) {
    toast.success("Customer Created", {
      description: [
        `${name} has been added successfully.`,
        agentName ? `Assigned to: ${agentName}` : null,
      ].filter(Boolean).join("\n"),
    })
  },

  customerUpdated(name?: string) {
    toast.success("Customer Profile Updated", {
      description: name
        ? `${name}'s details have been saved.`
        : "Customer profile has been saved.",
    })
  },

  customerDeactivated(name: string) {
    toast.success("Customer Deactivated", {
      description: `${name} has been deactivated. Their data is preserved.`,
    })
  },

  customerReactivated(name: string) {
    toast.success("Customer Reactivated", {
      description: `${name} is now active.`,
    })
  },

  customerReassigned(name: string, agentName: string) {
    toast.success("Customer Reassigned", {
      description: `${name} has been reassigned to ${agentName}.`,
    })
  },

  customerCreationFailed(reason?: string) {
    toast.error("Customer Creation Failed", {
      description: reason || "Please check the form and try again.",
    })
  },

  customerUpdateFailed(reason?: string) {
    toast.error("Customer Update Failed", {
      description: reason || "Could not save customer details. Please try again.",
    })
  },

  // ── Agent toasts ──────────────────────────────────────────────────────────

  agentCreated(name: string, employeeCode?: string) {
    toast.success("Agent Created", {
      description: [
        `${name} has been added successfully.`,
        employeeCode ? `Employee ID: ${employeeCode}` : null,
        "Temporary password has been generated.",
      ].filter(Boolean).join("\n"),
    })
  },

  agentUpdated(name?: string) {
    toast.success("Agent Profile Updated", {
      description: name
        ? `${name}'s profile has been saved.`
        : "Agent profile has been saved.",
    })
  },

  agentStatusChanged(name: string, newStatus: string) {
    const label =
      newStatus === "ARCHIVED" ? "archived" :
      newStatus === "INACTIVE" ? "deactivated" :
      "reactivated"
    const icon = newStatus === "ACTIVE" ? "✓ " : ""
    toast.success(`Agent ${newStatus === "ACTIVE" ? "Reactivated" : newStatus === "INACTIVE" ? "Deactivated" : "Archived"}`, {
      description: `${icon}${name} has been ${label}. Assignments have been updated.`,
    })
  },

  agentCreationFailed(reason?: string) {
    toast.error("Agent Creation Failed", {
      description: reason || "Please check the form and try again.",
    })
  },

  agentUpdateFailed(reason?: string) {
    toast.error("Agent Update Failed", {
      description: reason || "Could not save agent details. Please try again.",
    })
  },

  // ── Loan toasts ───────────────────────────────────────────────────────────

  loanCreated(customerName?: string) {
    toast.success("Loan Application Created", {
      description: customerName
        ? `Pending review for ${customerName}. Approve to activate.`
        : "Loan application submitted. Pending approval.",
    })
  },

  loanApproved(customerName: string, amount: number, accountNo?: string) {
    toast.success("Loan Approved", {
      description: [
        `Customer: ${customerName}`,
        `Approved Amount: ${fmt(amount)}`,
        accountNo ? `Account: ${accountNo}` : null,
        "EMI schedule has been generated.",
      ].filter(Boolean).join("\n"),
    })
  },

  loanRejected(customerName?: string) {
    toast.success("Loan Application Rejected", {
      description: customerName
        ? `${customerName}'s application has been declined.`
        : "Loan application has been declined.",
    })
  },

  loanApprovalFailed(reason?: string) {
    toast.error("Loan Approval Failed", {
      description: reason || "Unable to approve loan. Please review and try again.",
    })
  },

  loanRejectionFailed(reason?: string) {
    toast.error("Loan Rejection Failed", {
      description: reason || "Unable to process rejection. Please try again.",
    })
  },

  nomineeRequired() {
    toast.error("Nominee Information Required", {
      description: "A nominee must be added before approving this loan. Use '+ Add Nominee Now' to continue.",
    })
  },

  // ── Savings toasts ────────────────────────────────────────────────────────

  savingsCollected(amount: number, customerName?: string, receiptNo?: string) {
    toast.success("Savings Deposit Recorded", {
      description: [
        customerName ? `Customer: ${customerName}` : null,
        `Amount: ${fmt(amount)}`,
        receiptNo ? `Receipt: ${receiptNo}` : null,
      ].filter(Boolean).join("\n"),
    })
  },

  savingsCollectionFailed(reason?: string) {
    toast.error("Collection Failed", {
      description: reason || "Amount must be greater than zero. Please verify and try again.",
    })
  },

  savingsPlanCreated(planName?: string) {
    toast.success("Savings Plan Created", {
      description: planName
        ? `"${planName}" is now available for customers to apply.`
        : "New savings plan is now available.",
    })
  },

  savingsPlanDeleted() {
    toast.success("Savings Plan Deleted", {
      description: "The plan has been removed. Existing accounts are unaffected.",
    })
  },

  savingsApplicationApproved(customerName?: string) {
    toast.success("Savings Application Approved", {
      description: customerName
        ? `${customerName}'s savings account has been opened.`
        : "Savings account opened successfully.",
    })
  },

  savingsApplicationRejected(customerName?: string) {
    toast.success("Savings Application Rejected", {
      description: customerName
        ? `${customerName}'s application has been declined.`
        : "Application has been declined.",
    })
  },

  // ── EMI / Collection toasts ───────────────────────────────────────────────

  emiCollected(amount: number, customerName: string, receiptNo?: string, loanClosed?: boolean) {
    if (loanClosed) {
      toast.success("Loan Fully Repaid! 🎉", {
        description: [
          `Customer: ${customerName}`,
          `Final EMI: ${fmt(amount)}`,
          receiptNo ? `Receipt: ${receiptNo}` : null,
          "All installments cleared. Loan account is now closed.",
        ].filter(Boolean).join("\n"),
      })
    } else {
      toast.success("EMI Payment Recorded", {
        description: [
          `Customer: ${customerName}`,
          `Amount: ${fmt(amount)}`,
          receiptNo ? `Receipt: ${receiptNo}` : null,
        ].filter(Boolean).join("\n"),
      })
    }
  },

  emiCollectionFailed(reason?: string) {
    toast.error("EMI Collection Failed", {
      description: reason || "Unable to record payment. Please try again.",
    })
  },

  // ── Report / Export toasts ────────────────────────────────────────────────

  reportExported(type = "Report") {
    toast.success(`${type} Downloaded`, {
      description: "Your file has been saved to the downloads folder.",
    })
  },

  exportFailed() {
    toast.error("Export Failed", {
      description: "Unable to generate the report. Please try again.",
    })
  },

  // ── Generic operational toasts ────────────────────────────────────────────

  saved(label?: string) {
    toast.success(label ? `${label} Saved` : "Changes Saved", {
      description: "Your changes have been saved successfully.",
    })
  },

  deleteFailed(label?: string) {
    toast.error(`${label || "Item"} Could Not Be Deleted`, {
      description: "An error occurred. Please try again.",
    })
  },

  formError() {
    toast.error("Please Fix the Highlighted Errors", {
      description: "Review the form fields marked in red before continuing.",
    })
  },

  networkError() {
    toast.error("Connection Problem", {
      description: "Check your internet connection and try again.",
    })
  },

  authError() {
    toast.error("Session Expired", {
      description: "Your session has expired. Please sign in again.",
    })
  },

  clipboardCopied(label?: string) {
    toast.success(label ? `${label} Copied` : "Copied to Clipboard")
  },

  clipboardFailed() {
    toast.error("Could Not Copy", {
      description: "Please copy the text manually.",
    })
  },
}
