import { motion } from "framer-motion";
import { Database, Zap, Lock, RefreshCw, Server, GitBranch, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const collections = [
  { name: "organizations", desc: "One document per organization containing name, address, currency, and subscription details." },
  { name: "organizationMembers", desc: "Membership documents keyed by orgId_clerkUserId. Contains role, status, and profile data per member." },
  { name: "collections", desc: "All daily collection records with amount, agent, customer, timestamp, and status." },
  { name: "subscriptions", desc: "Active subscription records including plan, billing cycle, and expiry." },
  { name: "payments", desc: "Payment history for all subscription payments made by an organization." },
  { name: "invoices", desc: "Formal invoice records linked to payments for accounting and download." },
  { name: "loans", desc: "Loan records with principal, interest rate, EMI schedule, and status." },
  { name: "notifications", desc: "In-app notification documents targeted to specific users within an organization." },
];

const features = [
  { icon: Zap, title: "onSnapshot Listeners", desc: "Every dashboard subscribes to live Firestore listeners. Updates are pushed instantly to all connected clients." },
  { icon: Lock, title: "Security Rules", desc: "Declarative rules enforce that users can only read/write documents within their own organization." },
  { icon: RefreshCw, title: "Offline Persistence", desc: "Firestore caches data locally. The app works in low-connectivity conditions and syncs when reconnected." },
  { icon: Server, title: "Serverless Architecture", desc: "No backend servers needed. The app connects directly to Firestore with client-side SDKs." },
  { icon: GitBranch, title: "Atomic Writes", desc: "Complex operations use Firestore transactions and batch writes to ensure data consistency." },
  { icon: Database, title: "Scalable Storage", desc: "Firestore scales automatically with no provisioning needed — from 10 to 10 million documents." },
];

export default function FirestorePage() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px]">
          <div className="absolute left-1/3 top-0 h-80 w-80 rounded-full bg-emerald-100/50 blur-[120px]" />
          <div className="absolute right-1/4 top-10 h-64 w-64 rounded-full bg-sky-100/40 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <section className="py-20 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
                <Database className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-600">Platform — Database</span>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-5">Firestore Architecture</h1>
              <p className="text-lg text-slate-500 mb-8">
                FundCircle is built entirely on Google Cloud Firestore — a realtime, serverless NoSQL database that scales automatically and syncs changes to every connected client instantly.
              </p>
              <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-600 transition">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </section>

          <section className="mb-16">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Core Firestore capabilities</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-6">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-24 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Database collections</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-left font-bold text-slate-700 pr-8">Collection</th>
                    <th className="pb-3 text-left font-bold text-slate-700">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {collections.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 pr-8">
                        <code className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">{col.name}</code>
                      </td>
                      <td className="py-3 text-slate-500 text-xs leading-5">{col.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
