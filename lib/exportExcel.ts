import ExcelJS from "exceljs";
import { format } from "date-fns";
import type { Collection, Loan, LoanInstallment, Membership, SavingsAccount } from "@/types";

// ── Timestamp helper ──────────────────────────────────────────────────────────
function tsToDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts?.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

function fmtDate(ts: any): string {
  const d = tsToDate(ts);
  if (!d || d.getTime() <= 0) return "—";
  return format(d, "dd-MMM-yyyy hh:mm aa").replace(" am", " AM").replace(" pm", " PM");
}

function fmtINR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

// ── ARGB colour constants ─────────────────────────────────────────────────────
const C = {
  DARK_BLUE:    "FF1B3A5C",
  WHITE:        "FFFFFFFF",
  LIGHT_GRAY:   "FFF8FAFC",
  LIGHT_GREEN:  "FFD1FAE5",
  DARK_GREEN:   "FF065F46",
  LIGHT_ORANGE: "FFFFEDD5",
  DARK_ORANGE:  "FF9A3412",
  LIGHT_PURPLE: "FFEDE9FE",
  DARK_PURPLE:  "FF4C1D95",
  LIGHT_RED:    "FFFEE2E2",
  DARK_RED:     "FF991B1B",
  LIGHT_AMBER:  "FFFEF3C7",
  DARK_AMBER:   "FF92400E",
  SUMMARY_BG:   "FFE0EAF5",
  TAB_GREEN:    "FF10B981",
  TAB_ORANGE:   "FFF97316",
  TAB_PURPLE:   "FF7C3AED",
  TAB_INDIGO:   "FF6366F1",
  TAB_TEAL:     "FF0D9488",
};

function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

// ── Shared worksheet setup ────────────────────────────────────────────────────
function applyHeaderRow(row: ExcelJS.Row, numCols: number) {
  row.height = 28;
  for (let c = 1; c <= numCols; c++) {
    const cell = row.getCell(c);
    cell.fill = fill(C.DARK_BLUE);
    cell.font = { bold: true, color: { argb: C.WHITE }, size: 11, name: "Calibri" };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
    cell.border = { bottom: { style: "thin", color: { argb: "FF2D5A8E" } } };
  }
}

function freezeAndFilter(sheet: ExcelJS.Worksheet, numCols: number) {
  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];
  const lastCol = colLetter(numCols);
  sheet.autoFilter = `A1:${lastCol}1`;
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function autoFitColumns(sheet: ExcelJS.Worksheet, headers: string[], colWidths: number[]) {
  sheet.columns.forEach((col, i) => {
    col.width = Math.max((headers[i]?.length || 8) + 4, colWidths[i] || 10, 10);
  });
}

function shadeRow(row: ExcelJS.Row, skipCols: Set<number>, numCols: number) {
  for (let c = 1; c <= numCols; c++) {
    if (!skipCols.has(c)) {
      row.getCell(c).fill = fill(C.LIGHT_GRAY);
    }
  }
}

// ── Report title block (for Summary sheet) ────────────────────────────────────
function addTitleBlock(sheet: ExcelJS.Worksheet, orgName: string, generatedAt: string, numCols: number) {
  const lastCol = colLetter(numCols);

  sheet.mergeCells(`A1:${lastCol}1`);
  const title = sheet.getCell("A1");
  title.value = "FundCircle Collections Report";
  title.font = { bold: true, size: 20, color: { argb: C.DARK_BLUE }, name: "Calibri" };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.fill = fill("FFE8F0FA");
  sheet.getRow(1).height = 42;

  sheet.mergeCells(`A2:${lastCol}2`);
  const orgCell = sheet.getCell("A2");
  orgCell.value = `Organization: ${orgName}`;
  orgCell.font = { bold: true, size: 12, color: { argb: "FF334155" }, name: "Calibri" };
  orgCell.alignment = { horizontal: "center", vertical: "middle" };
  orgCell.fill = fill("FFF0F6FF");
  sheet.getRow(2).height = 24;

  sheet.mergeCells(`A3:${lastCol}3`);
  const dateCell = sheet.getCell("A3");
  dateCell.value = `Generated: ${generatedAt}`;
  dateCell.font = { size: 10, color: { argb: "FF64748B" }, italic: true, name: "Calibri" };
  dateCell.alignment = { horizontal: "center", vertical: "middle" };
  dateCell.fill = fill("FFF0F6FF");
  sheet.getRow(3).height = 18;

  sheet.getRow(4).height = 10;
}

// ── Status color helper ───────────────────────────────────────────────────────
function applyStatusColor(cell: ExcelJS.Cell, status: string) {
  const s = status.toUpperCase();
  if (["ACTIVE", "COMPLETED", "PAID", "APPROVED"].includes(s)) {
    cell.fill = fill(C.LIGHT_GREEN);
    cell.font = { color: { argb: C.DARK_GREEN }, bold: true, size: 10, name: "Calibri" };
  } else if (["PENDING", "PENDING_SETUP", "PENDING_INVITED", "PENDING_APPROVAL"].includes(s)) {
    cell.fill = fill(C.LIGHT_AMBER);
    cell.font = { color: { argb: C.DARK_AMBER }, bold: true, size: 10, name: "Calibri" };
  } else if (["OVERDUE", "FAILED", "REJECTED", "SUSPENDED"].includes(s)) {
    cell.fill = fill(C.LIGHT_RED);
    cell.font = { color: { argb: C.DARK_RED }, bold: true, size: 10, name: "Calibri" };
  } else if (["INACTIVE", "CLOSED", "DEACTIVATED", "FROZEN"].includes(s)) {
    cell.fill = fill(C.LIGHT_GRAY);
    cell.font = { color: { argb: "FF475569" }, bold: true, size: 10, name: "Calibri" };
  }
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

function applyTypeColor(cell: ExcelJS.Cell, type: string) {
  const t = type.toUpperCase();
  if (t === "SAVINGS") {
    cell.fill = fill(C.LIGHT_GREEN);
    cell.font = { color: { argb: C.DARK_GREEN }, bold: true, size: 10, name: "Calibri" };
  } else if (t === "LOAN" || t === "LOAN_EMI" || t === "LOAN EMI" || t === "EMI") {
    cell.fill = fill(C.LIGHT_ORANGE);
    cell.font = { color: { argb: C.DARK_ORANGE }, bold: true, size: 10, name: "Calibri" };
  } else {
    cell.fill = fill(C.LIGHT_PURPLE);
    cell.font = { color: { argb: C.DARK_PURPLE }, bold: true, size: 10, name: "Calibri" };
  }
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

// ── Export options ────────────────────────────────────────────────────────────
export interface ExportOptions {
  orgName: string;
  collections: Collection[];
  members: Membership[];
  loans: Loan[];
  installments: LoanInstallment[];
  savingsAccounts: SavingsAccount[];
}

// ── Main export function ──────────────────────────────────────────────────────
export async function exportCollectionsReport(opts: ExportOptions): Promise<void> {
  const { orgName, collections, members, loans, installments, savingsAccounts } = opts;

  const wb = new ExcelJS.Workbook();
  wb.creator = "FundCircle";
  wb.created = new Date();
  wb.modified = new Date();

  const generatedAt = fmtDate(new Date());

  // ── Member lookup maps ────────────────────────────────────────────────────
  const memberById = new Map<string, Membership>();
  members.forEach((m) => {
    memberById.set(m.id, m);
    if (m.clerkUserId) memberById.set(m.clerkUserId, m);
  });

  const getName = (id: string | undefined | null, fallback = "—"): string => {
    if (!id) return fallback;
    const m = memberById.get(id);
    return (m as any)?.fullName || (m as any)?.name || m?.email || fallback;
  };

  const customers = members.filter((m) => (m.role as string).toUpperCase() === "CUSTOMER");
  const agents = members.filter((m) =>
    ["AGENT", "PIGMY_COLLECTOR", "agent"].includes((m.role as string))
  );

  // ╔══════════════════════════════════════════════════════════╗
  // ║  SHEET 1 — SUMMARY                                       ║
  // ╚══════════════════════════════════════════════════════════╝
  const sumSheet = wb.addWorksheet("Summary", {
    properties: { tabColor: { argb: C.DARK_BLUE } },
  });

  addTitleBlock(sumSheet, orgName, generatedAt, 4);

  // Stats header at row 5
  const sumHdrRow = sumSheet.getRow(5);
  ["Metric", "Value", "Details", "Count"].forEach((h, i) => {
    sumHdrRow.getCell(i + 1).value = h;
  });
  applyHeaderRow(sumHdrRow, 4);

  const totalAmount = collections.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const savingsAmount = collections
    .filter((c) => c.collectionType !== "LOAN_EMI")
    .reduce((s, c) => s + Number(c.amount), 0);
  const emiAmount = collections
    .filter((c) => c.collectionType === "LOAN_EMI")
    .reduce((s, c) => s + Number(c.amount), 0);
  const uniqueCustomers = new Set(collections.map((c) => c.customerId)).size;
  const uniqueAgents = new Set(collections.map((c) => c.agentId)).size;
  const activeLoans = loans.filter((l) => (l.status || "").toUpperCase() === "ACTIVE").length;
  const activeSavAcc = savingsAccounts.filter((s) => (s.status || "").toUpperCase() === "ACTIVE").length;

  const summaryStats: [string, string | number, string, string | number][] = [
    ["Total Collections", collections.length, "All transactions", ""],
    ["Total Amount", fmtINR(totalAmount), "Savings + EMI", ""],
    ["Savings Collections", fmtINR(savingsAmount), "Deposits collected", collections.filter((c) => c.collectionType !== "LOAN_EMI").length],
    ["EMI Collections", fmtINR(emiAmount), "Loan repayments", collections.filter((c) => c.collectionType === "LOAN_EMI").length],
    ["Total Customers", customers.length, "Active customers", uniqueCustomers],
    ["Total Agents", agents.length, "Active collectors", uniqueAgents],
    ["Active Loans", activeLoans, "In portfolio", loans.length],
    ["Active Savings Accounts", activeSavAcc, "In portfolio", savingsAccounts.length],
  ];

  summaryStats.forEach(([metric, value, details, count], i) => {
    const row = sumSheet.getRow(6 + i);
    row.height = 22;
    const isAlt = i % 2 === 1;
    const bg = isAlt ? C.LIGHT_GRAY : C.WHITE;

    row.getCell(1).value = metric;
    row.getCell(1).font = { bold: true, size: 11, name: "Calibri" };
    row.getCell(1).fill = fill(bg);

    row.getCell(2).value = value;
    row.getCell(2).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    row.getCell(2).fill = fill(bg);

    row.getCell(3).value = details;
    row.getCell(3).font = { size: 10, color: { argb: "FF64748B" }, name: "Calibri" };
    row.getCell(3).fill = fill(bg);

    row.getCell(4).value = count;
    row.getCell(4).font = { size: 10, name: "Calibri" };
    row.getCell(4).fill = fill(bg);
    row.getCell(4).alignment = { horizontal: "center" };
  });

  sumSheet.getColumn(1).width = 30;
  sumSheet.getColumn(2).width = 22;
  sumSheet.getColumn(3).width = 25;
  sumSheet.getColumn(4).width = 12;

  // ╔══════════════════════════════════════════════════════════╗
  // ║  SHEET 2 — COLLECTIONS                                   ║
  // ╚══════════════════════════════════════════════════════════╝
  const colSheet = wb.addWorksheet("Collections", {
    properties: { tabColor: { argb: C.TAB_GREEN } },
  });

  const colHeaders = [
    "Receipt No", "Collection Date", "Customer Name", "Customer ID",
    "Account Type", "Agent Name", "Amount (₹)", "Payment Mode", "Status",
  ];

  // Title block for this sheet too
  addTitleBlock(colSheet, orgName, generatedAt, colHeaders.length);

  const colHdrRow = colSheet.getRow(5);
  colHeaders.forEach((h, i) => { colHdrRow.getCell(i + 1).value = h; });
  applyHeaderRow(colHdrRow, colHeaders.length);
  freezeAndFilter(colSheet, colHeaders.length);
  // Override freeze to keep title + header (ySplit=5 means rows 1-5 frozen is too much, keep only header at row 5)
  colSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 5 }];

  const sortedCols = [...collections].sort(
    (a, b) =>
      tsToDate(b.collectedAt || b.timestamp).valueOf() -
      tsToDate(a.collectedAt || a.timestamp).valueOf()
  );

  // Track max widths for auto-fit
  const colMaxW = colHeaders.map((h) => h.length);

  sortedCols.forEach((col, idx) => {
    const custName = getName(col.customerId, col.customerId?.slice(-6) || "—");
    const agentName = getName(col.agentId, col.collectedByName || "—");
    const collDate = tsToDate(col.collectedAt || col.timestamp);
    const isSavings = col.collectionType !== "LOAN_EMI";
    const typeLabel = isSavings ? "Savings" : "Loan EMI";
    const statusLabel = col.status || "Completed";
    const payMode = (col.collectedByRole || "Cash").replace(/_/g, " ");
    const amount = Number(col.amount) || 0;

    const rowNum = 6 + idx;
    const row = colSheet.getRow(rowNum);
    row.height = 20;
    const isAlt = idx % 2 === 1;
    const coloredCols = new Set<number>();

    const vals = [
      col.receiptNo || "—",
      collDate.getTime() > 0 ? fmtDate(col.collectedAt || col.timestamp) : "—",
      custName,
      col.customerId || "—",
      typeLabel,
      agentName,
      fmtINR(amount),
      payMode,
      statusLabel,
    ];

    vals.forEach((v, ci) => {
      row.getCell(ci + 1).value = v;
      if (typeof v === "string" && v.length > colMaxW[ci]) colMaxW[ci] = v.length;
    });

    // Amount — right-align
    row.getCell(7).alignment = { horizontal: "right" };
    row.getCell(7).font = { bold: true, color: { argb: C.DARK_BLUE }, name: "Calibri" };

    // Account Type badge
    applyTypeColor(colSheet.getRow(rowNum).getCell(5), isSavings ? "SAVINGS" : "LOAN_EMI");
    coloredCols.add(5);

    // Status badge
    applyStatusColor(colSheet.getRow(rowNum).getCell(9), statusLabel);
    coloredCols.add(9);

    if (isAlt) shadeRow(row, coloredCols, colHeaders.length);

    // Thin bottom border on all cells
    for (let c = 1; c <= colHeaders.length; c++) {
      row.getCell(c).border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
    }
  });

  // Summary / totals row
  if (sortedCols.length > 0) {
    const totRow = colSheet.getRow(6 + sortedCols.length);
    totRow.height = 24;
    totRow.getCell(1).value = `TOTAL — ${sortedCols.length} records`;
    totRow.getCell(1).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    totRow.getCell(7).value = fmtINR(totalAmount);
    totRow.getCell(7).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    totRow.getCell(7).alignment = { horizontal: "right" };
    for (let c = 1; c <= colHeaders.length; c++) {
      totRow.getCell(c).fill = fill(C.SUMMARY_BG);
      totRow.getCell(c).border = { top: { style: "medium", color: { argb: C.DARK_BLUE } } };
    }
  }

  colSheet.columns.forEach((col, i) => {
    col.width = Math.max(colMaxW[i] + 4, 12);
  });

  // ╔══════════════════════════════════════════════════════════╗
  // ║  SHEET 3 — SAVINGS ACCOUNTS                              ║
  // ╚══════════════════════════════════════════════════════════╝
  const savSheet = wb.addWorksheet("Savings", {
    properties: { tabColor: { argb: C.TAB_TEAL } },
  });

  const savHeaders = [
    "Account No", "Customer Name", "Plan Name", "Plan Type",
    "Scheduled Amount (₹)", "Balance (₹)", "Interest Rate (%)",
    "Agent", "Status", "Start Date",
  ];

  addTitleBlock(savSheet, orgName, generatedAt, savHeaders.length);
  const savHdrRow = savSheet.getRow(5);
  savHeaders.forEach((h, i) => { savHdrRow.getCell(i + 1).value = h; });
  applyHeaderRow(savHdrRow, savHeaders.length);
  savSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 5 }];
  freezeAndFilter(savSheet, savHeaders.length);

  const savMaxW = savHeaders.map((h) => h.length);

  savingsAccounts.forEach((sa, idx) => {
    const custName = getName(sa.customerId, sa.customerName || "—");
    const agentName = getName(sa.assignedAgentId, sa.assignedAgentName || "—");
    const rowNum = 6 + idx;
    const row = savSheet.getRow(rowNum);
    row.height = 20;
    const isAlt = idx % 2 === 1;
    const coloredCols = new Set<number>();

    const vals = [
      sa.accountNumber || sa.id.slice(-8),
      custName,
      sa.planName || "—",
      (sa.planType || "—").replace(/_/g, " "),
      fmtINR(sa.scheduledAmount),
      fmtINR(sa.totalBalance),
      sa.interestRate ? `${sa.interestRate}%` : "—",
      agentName,
      sa.status || "—",
      sa.startDate ? fmtDate(sa.startDate) : "—",
    ];

    vals.forEach((v, ci) => {
      row.getCell(ci + 1).value = v;
      if (v.length > savMaxW[ci]) savMaxW[ci] = v.length;
    });

    row.getCell(5).alignment = { horizontal: "right" };
    row.getCell(6).alignment = { horizontal: "right" };
    row.getCell(6).font = { bold: true, color: { argb: C.DARK_BLUE }, name: "Calibri" };

    applyStatusColor(savSheet.getRow(rowNum).getCell(9), sa.status || "");
    coloredCols.add(9);

    if (isAlt) shadeRow(row, coloredCols, savHeaders.length);
    for (let c = 1; c <= savHeaders.length; c++) {
      row.getCell(c).border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
    }
  });

  // Totals row
  if (savingsAccounts.length > 0) {
    const savTotRow = savSheet.getRow(6 + savingsAccounts.length);
    savTotRow.height = 24;
    const totalBal = savingsAccounts.reduce((s, a) => s + (Number(a.totalBalance) || 0), 0);
    savTotRow.getCell(1).value = `TOTAL — ${savingsAccounts.length} accounts`;
    savTotRow.getCell(1).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    savTotRow.getCell(6).value = fmtINR(totalBal);
    savTotRow.getCell(6).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    savTotRow.getCell(6).alignment = { horizontal: "right" };
    for (let c = 1; c <= savHeaders.length; c++) {
      savTotRow.getCell(c).fill = fill(C.SUMMARY_BG);
      savTotRow.getCell(c).border = { top: { style: "medium", color: { argb: C.DARK_BLUE } } };
    }
  }

  savSheet.columns.forEach((col, i) => { col.width = Math.max(savMaxW[i] + 4, 12); });

  // ╔══════════════════════════════════════════════════════════╗
  // ║  SHEET 4 — LOAN EMI INSTALLMENTS                         ║
  // ╚══════════════════════════════════════════════════════════╝
  const emiSheet = wb.addWorksheet("Loan EMI", {
    properties: { tabColor: { argb: C.TAB_ORANGE } },
  });

  const emiHeaders = [
    "Installment No", "Loan Account No", "Customer Name",
    "Due Date", "EMI Amount (₹)", "Paid Amount (₹)",
    "Paid Date", "Collected By", "Status",
  ];

  addTitleBlock(emiSheet, orgName, generatedAt, emiHeaders.length);
  const emiHdrRow = emiSheet.getRow(5);
  emiHeaders.forEach((h, i) => { emiHdrRow.getCell(i + 1).value = h; });
  applyHeaderRow(emiHdrRow, emiHeaders.length);
  emiSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 5 }];
  freezeAndFilter(emiSheet, emiHeaders.length);

  const emiMaxW = emiHeaders.map((h) => h.length);

  // Build loan account number lookup
  const loanById = new Map<string, Loan>();
  loans.forEach((l) => loanById.set(l.id, l));

  installments.forEach((inst, idx) => {
    const custName = getName(inst.customerId, "—");
    const agentName = inst.collectedByAgentName || getName(inst.collectedByAgentId, "—");
    const loan = loanById.get(inst.loanId);
    const loanAccNo = loan?.loanAccountNumber || inst.loanId?.slice(-8) || "—";
    const rowNum = 6 + idx;
    const row = emiSheet.getRow(rowNum);
    row.height = 20;
    const isAlt = idx % 2 === 1;
    const coloredCols = new Set<number>();

    const vals = [
      String(inst.installmentNo || idx + 1),
      loanAccNo,
      custName,
      inst.dueDate ? fmtDate(inst.dueDate) : "—",
      fmtINR(inst.emiAmount),
      fmtINR(inst.paidAmount),
      inst.paidAt ? fmtDate(inst.paidAt) : "—",
      agentName,
      inst.status || "—",
    ];

    vals.forEach((v, ci) => {
      row.getCell(ci + 1).value = v;
      if (v.length > emiMaxW[ci]) emiMaxW[ci] = v.length;
    });

    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(5).alignment = { horizontal: "right" };
    row.getCell(6).alignment = { horizontal: "right" };
    row.getCell(6).font = { bold: true, color: { argb: C.DARK_BLUE }, name: "Calibri" };

    applyStatusColor(emiSheet.getRow(rowNum).getCell(9), inst.status || "PENDING");
    coloredCols.add(9);

    if (isAlt) shadeRow(row, coloredCols, emiHeaders.length);
    for (let c = 1; c <= emiHeaders.length; c++) {
      row.getCell(c).border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
    }
  });

  if (installments.length > 0) {
    const emiTotRow = emiSheet.getRow(6 + installments.length);
    emiTotRow.height = 24;
    const totalEMIAmt = installments.reduce((s, i) => s + (Number(i.emiAmount) || 0), 0);
    const totalPaidAmt = installments.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0);
    emiTotRow.getCell(1).value = `TOTAL — ${installments.length} installments`;
    emiTotRow.getCell(1).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    emiTotRow.getCell(5).value = fmtINR(totalEMIAmt);
    emiTotRow.getCell(5).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    emiTotRow.getCell(5).alignment = { horizontal: "right" };
    emiTotRow.getCell(6).value = fmtINR(totalPaidAmt);
    emiTotRow.getCell(6).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    emiTotRow.getCell(6).alignment = { horizontal: "right" };
    for (let c = 1; c <= emiHeaders.length; c++) {
      emiTotRow.getCell(c).fill = fill(C.SUMMARY_BG);
      emiTotRow.getCell(c).border = { top: { style: "medium", color: { argb: C.DARK_BLUE } } };
    }
  }

  emiSheet.columns.forEach((col, i) => { col.width = Math.max(emiMaxW[i] + 4, 12); });

  // ╔══════════════════════════════════════════════════════════╗
  // ║  SHEET 5 — CUSTOMERS                                      ║
  // ╚══════════════════════════════════════════════════════════╝
  const custSheet = wb.addWorksheet("Customers", {
    properties: { tabColor: { argb: C.TAB_PURPLE } },
  });

  const custHeaders = [
    "Customer ID", "Full Name", "Email", "Phone",
    "Account Type", "Status", "Assigned Agent", "Address", "Created Date",
  ];

  addTitleBlock(custSheet, orgName, generatedAt, custHeaders.length);
  const custHdrRow = custSheet.getRow(5);
  custHeaders.forEach((h, i) => { custHdrRow.getCell(i + 1).value = h; });
  applyHeaderRow(custHdrRow, custHeaders.length);
  custSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 5 }];
  freezeAndFilter(custSheet, custHeaders.length);

  const custMaxW = custHeaders.map((h) => h.length);

  customers.forEach((c, idx) => {
    const agentName = getName((c as any).assignedAgentId || c.agentId, "—");
    const ct = ((c as any).customerType || "SAVINGS_LOAN") as string;
    const typeLabel = ct === "SAVINGS" ? "Savings Only" : ct === "LOAN" ? "Loan Only" : "Savings + Loan";
    const rowNum = 6 + idx;
    const row = custSheet.getRow(rowNum);
    row.height = 20;
    const isAlt = idx % 2 === 1;
    const coloredCols = new Set<number>();

    const vals = [
      c.id.slice(-10),
      (c as any).fullName || (c as any).name || "—",
      c.email || "—",
      c.phone || "—",
      typeLabel,
      c.status || "—",
      agentName,
      c.address || "—",
      c.createdAt ? fmtDate(c.createdAt) : "—",
    ];

    vals.forEach((v, ci) => {
      row.getCell(ci + 1).value = v;
      if (v.length > custMaxW[ci]) custMaxW[ci] = v.length;
    });

    // Account type color
    applyTypeColor(custSheet.getRow(rowNum).getCell(5), ct);
    coloredCols.add(5);

    // Status color
    applyStatusColor(custSheet.getRow(rowNum).getCell(6), c.status || "");
    coloredCols.add(6);

    if (isAlt) shadeRow(row, coloredCols, custHeaders.length);
    for (let c2 = 1; c2 <= custHeaders.length; c2++) {
      row.getCell(c2).border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
    }
  });

  if (customers.length > 0) {
    const custTotRow = custSheet.getRow(6 + customers.length);
    custTotRow.height = 24;
    custTotRow.getCell(1).value = `TOTAL — ${customers.length} customers`;
    custTotRow.getCell(1).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    for (let c = 1; c <= custHeaders.length; c++) {
      custTotRow.getCell(c).fill = fill(C.SUMMARY_BG);
      custTotRow.getCell(c).border = { top: { style: "medium", color: { argb: C.DARK_BLUE } } };
    }
  }

  custSheet.columns.forEach((col, i) => { col.width = Math.max(custMaxW[i] + 4, 12); });

  // ╔══════════════════════════════════════════════════════════╗
  // ║  SHEET 6 — AGENTS                                         ║
  // ╚══════════════════════════════════════════════════════════╝
  const agentSheet = wb.addWorksheet("Agents", {
    properties: { tabColor: { argb: C.TAB_INDIGO } },
  });

  const agentHeaders = [
    "Employee Code", "Full Name", "Email", "Phone",
    "Status", "Assigned Area", "Total Collections", "Total Collected (₹)", "Created Date",
  ];

  addTitleBlock(agentSheet, orgName, generatedAt, agentHeaders.length);
  const agentHdrRow = agentSheet.getRow(5);
  agentHeaders.forEach((h, i) => { agentHdrRow.getCell(i + 1).value = h; });
  applyHeaderRow(agentHdrRow, agentHeaders.length);
  agentSheet.views = [{ state: "frozen", xSplit: 0, ySplit: 5 }];
  freezeAndFilter(agentSheet, agentHeaders.length);

  const agentMaxW = agentHeaders.map((h) => h.length);

  agents.forEach((a, idx) => {
    const agentCols = collections.filter(
      (col) => col.agentId === a.id || col.agentId === a.clerkUserId
    );
    const totalCollected = agentCols.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    const rowNum = 6 + idx;
    const row = agentSheet.getRow(rowNum);
    row.height = 20;
    const isAlt = idx % 2 === 1;
    const coloredCols = new Set<number>();

    const vals = [
      (a as any).employeeCode || "—",
      (a as any).fullName || (a as any).name || "—",
      a.email || "—",
      a.phone || "—",
      a.status || "ACTIVE",
      (a as any).assignedArea || "—",
      String(agentCols.length),
      fmtINR(totalCollected),
      a.createdAt ? fmtDate(a.createdAt) : "—",
    ];

    vals.forEach((v, ci) => {
      row.getCell(ci + 1).value = v;
      if (v.length > agentMaxW[ci]) agentMaxW[ci] = v.length;
    });

    row.getCell(7).alignment = { horizontal: "center" };
    row.getCell(8).alignment = { horizontal: "right" };
    row.getCell(8).font = { bold: true, color: { argb: C.DARK_BLUE }, name: "Calibri" };

    applyStatusColor(agentSheet.getRow(rowNum).getCell(5), a.status || "ACTIVE");
    coloredCols.add(5);

    if (isAlt) shadeRow(row, coloredCols, agentHeaders.length);
    for (let c = 1; c <= agentHeaders.length; c++) {
      row.getCell(c).border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
    }
  });

  if (agents.length > 0) {
    const agTotRow = agentSheet.getRow(6 + agents.length);
    agTotRow.height = 24;
    const grandTotal = agents.reduce((s, a) => {
      const agCols = collections.filter((c) => c.agentId === a.id || c.agentId === a.clerkUserId);
      return s + agCols.reduce((ss, c) => ss + Number(c.amount), 0);
    }, 0);
    agTotRow.getCell(1).value = `TOTAL — ${agents.length} agents`;
    agTotRow.getCell(1).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    agTotRow.getCell(8).value = fmtINR(grandTotal);
    agTotRow.getCell(8).font = { bold: true, size: 11, color: { argb: C.DARK_BLUE }, name: "Calibri" };
    agTotRow.getCell(8).alignment = { horizontal: "right" };
    for (let c = 1; c <= agentHeaders.length; c++) {
      agTotRow.getCell(c).fill = fill(C.SUMMARY_BG);
      agTotRow.getCell(c).border = { top: { style: "medium", color: { argb: C.DARK_BLUE } } };
    }
  }

  agentSheet.columns.forEach((col, i) => { col.width = Math.max(agentMaxW[i] + 4, 12); });

  // ── Trigger download ──────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `FundCircle_Report_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
