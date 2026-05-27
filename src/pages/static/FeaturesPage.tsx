import { motion } from "framer-motion";
import { BarChart3, Bell, Clock3, Database, FileText, Globe, IndianRupee, Layers, Lock, ShieldCheck, Sparkles, Users, Wallet, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const features = [
  { icon: BarChart3, color: "sky", title: "Realtime Analytics", desc: "Live dashboards that update instantly with every collection. Track daily, weekly, and monthly performance across all agents." },
  { icon: Layers, color: "violet", title: "Multi-Tenant Architecture", desc: "Complete data isolation between organizations. Each workspace has its own secure data boundary with role enforcement." },
  { icon: ShieldCheck, color: "sky", title: "Clerk Enterprise Auth", desc: "OTP email verification, Google OAuth, session management, and organization-level access control powered by Clerk." },
  { icon: Database, color: "emerald", title: "Firestore Realtime Sync", desc: "All dashboards update in real-time using Firestore onSnapshot listeners. No polling, no stale data." },
  { icon: Users, color: "violet", title: "Agent Management", desc: "Invite, assign, and track field collectors. Set collection areas, view visit history, and monitor daily performance." },
  { icon: Wallet, color: "amber", title: "Customer Savings Tracking", desc: "Track every customer's balance, savings history, daily collections, and outstanding amounts in one place." },
  { icon: IndianRupee, color: "emerald", title: "Loan & EMI Management", desc: "Create loans, compute EMI schedules, process payments, and track outstanding balances with full audit trails." },
  { icon: FileText, color: "sky", title: "Export & Reports", desc: "Generate daily and monthly reports in CSV and Excel. Print receipts. Filter by agent, date, or customer." },
  { icon: Bell, color: "violet", title: "Notification System", desc: "Push in-app notifications for collections, loans, overdue payments, and organization events in real-time." },
  { icon: Lock, color: "amber", title: "Role-Based Access", desc: "Owner, Collector, and Customer roles with strict permission boundaries. Prevent cross-role data access." },
  { icon: Globe, color: "sky", title: "Mobile Responsive", desc: "Fully optimized for Android and iOS browsers. Agents can log collections on their phones in the field." },
  { icon: Clock3, color: "emerald", title: "Offline Resilience", desc: "Firestore's offline capabilities keep your app functional even when internet connectivity is intermittent." },
];

const colorMap: Record<string, string> = {
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

export default function FeaturesPage() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px]">
          <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-sky-100/60 blur-[120px]" />
          <div className="absolute right-1/4 top-20 h-72 w-72 rounded-full bg-violet-100/50 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <section className="py-20 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500 mb-4">Platform Features</p>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-5">Everything you need to run <br className="hidden sm:block" />a modern collection operation</h1>
              <p className="mx-auto max-w-2xl text-lg text-slate-500 mb-8">FundCircle brings together authentication, realtime data, analytics, and role-based access into one production-grade SaaS platform.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/sign-up" className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-sky-300/30 hover:brightness-110 transition">Start Free Trial</Link>
                <Link to="/pricing" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">View Pricing</Link>
              </div>
            </motion.div>
          </section>

          <section className="pb-24">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${colorMap[f.color]}`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm leading-6 text-slate-500">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-24 rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-10 text-center shadow-xl shadow-slate-200/40">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-sky-500" />
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Ready to get started?</h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">Launch your collection operation in minutes. No setup fees, no contracts.</p>
            <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-sky-300/30 hover:brightness-110 transition">
              Create your organization →
            </Link>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
