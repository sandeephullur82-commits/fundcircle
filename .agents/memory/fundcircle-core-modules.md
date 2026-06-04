---
name: FundCircle core modules
description: Pigmy savings + loan SaaS architecture decisions — receipt numbering, data IDs, Firestore query constraints, dashboard wiring.
---

## Receipt Numbering
- Format: `FC-{ORGSLUG}-{YYYYMMDD}-{SEQ4}` where SEQ4 is a 4-digit daily counter
- Stored in `receiptCounters/{orgId}_{YYYYMMDD}` Firestore doc using runTransaction to prevent races
- Receipt data written to both `collections` (master ledger) and `savings_transactions` (for passbook)

## ID Conventions
- `savings_accounts.customerId` = membershipDocId (`${orgId}_${clerkUserId}`) NOT bare clerkUserId
- `collections.customerId` = membershipDocId
- `loan_installments.loanId` = loan document ID
- `organizationMembers` doc ID = `${orgId}_${clerkUserId}`

## Firestore Query Constraints
- `where("status", "!=", "PAID")` on loan_installments requires a composite index (loanId + status)
- CustomerDashboard uses `useCollectionRealtimeRaw` with explicit `where("customerId", "==", membershipId)` because the customer's org context is needed for non-org-scoped collections

## Dashboard Tab Wiring
- OrgDashboard: "auditLogs" tab → OrgAuditLogs; admin sidebar includes ClipboardList icon
- AgentDashboard: "emi" tab → AgentEMICollection; CreditCard icon; between "pending" and "customers"
- OrgOverview Quick Actions fire `window.dispatchEvent(new CustomEvent("fundcircle:switchTab", { detail: tabId }))` which OrgDashboard listens to

## EMI Auto-close
- `recordEMICollection` returns `{ receiptNo, loanClosed }` — when `loanClosed=true` loan status updated to CLOSED
- Outstanding balance decremented by emiAmount each payment; auto-closes when ≤ 0

## Firestore Rules Pattern
- All collections use `hasMembership(orgId)` + role check helper functions
- receiptCounters are unrestricted (protected by org context server-side, not rules)
- audit_logs are owner-read-only, immutable (no update/delete)

**Why:** The membershipDocId-as-customerId convention avoids cross-org data leaks since membershipDocId is org-scoped. The daily receipt counter pattern ensures unique receipt numbers per org per day without a global sequence.
