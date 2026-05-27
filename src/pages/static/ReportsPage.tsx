import { motion } from "framer-motion";
import { FileText, FileSpreadsheet, Calendar, Download, Filter, Printer, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const reportTypes = [
  { icon: FileText, color: "sky", name: "Daily Collection Report", desc: "Summary of all collections made on a specific day, grouped by agent and customer.", format: "CSV / PDF" },
  { icon: FileSpreadsheet, color: "emerald", name: "Monthly Statement", desc: "Full monthly breakdown of deposits, balances, and outstanding amounts per customer.", format: "Excel / CSV" },
  { icon: Users, color: "violet", name: "Agent Performance Report", desc: "Collection efficiency, visit counts, missed collections, and amounts per field agent.", format: "CSV / PDF" },
  { icon: Calendar, color: "amber", name: "Custom Date Range", desc: "Export any collection data filtered by a custom date range you specify.", format: "CSV / Excel" },
  { icon: Clock, color: "sky", name: "Collection History", desc: "Full audit trail for any customer showing every deposit and transaction over time.", format: "CSV / PDF" },
  { icon: Printer, color: "violet", name: "Receipt Generation", desc: "Print individual collection receipts for customers with QR code verification.", format: "PDF" },
];

export default function ReportsPage() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px]">
          <div className="absolute left-1/3 top-0 h-80 w-80 rounded-full bg-sky-100/50 blur-[100px]" />
          <div className="absolute right-1/4 top-10 h-64 w-64 rounded-full bg-emerald-100/50 blur-[90px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <section className="py-20 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500 mb-4">Reporting</p>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-5">Every report you need,<br className="hidden sm:block" />always up to date</h1>
              <p className="mx-auto max-w-xl text-lg text-slate-500 mb-8">
                Generate, filter, and export professional reports for collections, agents, and customers in seconds.
              </p>
              <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-sky-300/30 hover:brightness-110 transition">
                Try reports free →
              </Link>
            </motion.div>
          </section>

          <section className="pb-16">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reportTypes.map((r, i) => (
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${
                    r.color === "sky" ? "bg-sky-50 text-sky-600" :
                    r.color === "emerald" ? "bg-emerald-50 text-emerald-600" :
                    r.color === "violet" ? "bg-violet-50 text-violet-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    <r.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">{r.name}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-3">{r.desc}</p>
                  <div className="flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-400">{r.format}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-24 rounded-3xl border border-slate-200 bg-white p-10 shadow-lg">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">How reports work</h2>
                <ul className="space-y-3">
                  {[
                    "Every collection is saved instantly to Firestore",
                    "Reports pull live data with Firestore queries",
                    "Apply filters by date, agent, or customer",
                    "Export to CSV or Excel with one click",
                    "Download receipts as printable PDFs",
                    "Share reports via email directly",
                  ].map((step) => (
                    <li key={step} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-slate-50 p-6 border border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Available Formats</p>
                <div className="space-y-3">
                  {[
                    { label: "CSV", desc: "Universal spreadsheet format compatible with Excel, Sheets" },
                    { label: "Excel (.xlsx)", desc: "Native Excel format with styling and multiple sheets" },
                    { label: "PDF", desc: "Printable receipts and formal report documents" },
                  ].map((fmt) => (
                    <div key={fmt.label} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200">
                      <FileText className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-slate-800">{fmt.label}</p>
                        <p className="text-xs text-slate-400">{fmt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
