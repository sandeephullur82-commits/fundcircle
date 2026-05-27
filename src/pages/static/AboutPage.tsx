import { motion } from "framer-motion";
import { Heart, Target, Zap, ShieldCheck, Users, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const values = [
  { icon: Heart, color: "rose", title: "Built with care", desc: "Every feature is designed with real pigmy collection workflows in mind — from daily agent rounds to monthly settlements." },
  { icon: Target, color: "sky", title: "Focused on simplicity", desc: "We believe powerful software doesn't have to be complex. FundCircle is intuitive for field agents and owners alike." },
  { icon: ShieldCheck, color: "emerald", title: "Security first", desc: "Your financial data is protected with Clerk enterprise auth, Firestore rules, and per-tenant data isolation at every layer." },
  { icon: Zap, color: "amber", title: "Always realtime", desc: "We chose Firestore onSnapshot listeners so every dashboard reflects the current truth — no refresh, no delay." },
  { icon: Users, color: "violet", title: "Multi-role platform", desc: "We built three distinct experiences for owners, agents, and customers — each optimized for their specific workflow." },
  { icon: Globe, color: "sky", title: "Built for India", desc: "Designed specifically for the Indian pigmy collection market with ₹ currency, local workflows, and mobile-first design." },
];

const colorMap: Record<string, string> = {
  rose: "bg-rose-50 text-rose-500",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
};

const milestones = [
  { year: "2024", event: "FundCircle founded to modernize daily pigmy collection management." },
  { year: "Q2 2024", event: "Launched multi-tenant architecture on Firebase + Clerk." },
  { year: "Q3 2024", event: "Added loan & EMI management for cooperative banks." },
  { year: "Q4 2024", event: "Reached 1,000+ active organizations across Karnataka." },
  { year: "2025", event: "Expanded to full-featured analytics, CSV exports, and custom reports." },
  { year: "2026", event: "Rebuilt on React 19 + Vite + Tailwind CSS v4 with premium UI." },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px]">
          <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-sky-100/50 blur-[120px]" />
          <div className="absolute right-1/4 top-16 h-72 w-72 rounded-full bg-violet-100/50 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <section className="py-20 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500 mb-4">About FundCircle</p>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-5">
                Modernizing pigmy collections<br className="hidden sm:block" />for financial institutions
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-slate-500">
                FundCircle was built to replace paper ledgers and spreadsheets with a secure, realtime, multi-tenant SaaS platform — purpose-built for cooperative banks, NBFCs, and chit fund operators across India.
              </p>
            </motion.div>
          </section>

          <section className="mb-20">
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl shadow-slate-200/40">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500 mb-3">Our Mission</p>
                  <h2 className="text-3xl font-bold text-slate-900 mb-5">Give every pigmy collector a digital-first operation</h2>
                  <p className="text-slate-500 leading-7 mb-4">
                    Millions of daily savings collections happen on paper across India every day. Agents carry physical ledgers, owners reconcile manually, and customers have no digital record of their savings.
                  </p>
                  <p className="text-slate-500 leading-7">
                    FundCircle digitizes the entire workflow — from the agent's morning round to the owner's evening report — with realtime sync, mobile-first design, and enterprise-grade security.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: "1,200+", label: "Organizations" },
                    { value: "8,400+", label: "Active Agents" },
                    { value: "95,000+", label: "Collections/month" },
                    { value: "₹12Cr+", label: "Managed monthly" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
                      <p className="text-2xl font-extrabold text-sky-600 mb-1">{s.value}</p>
                      <p className="text-xs font-medium text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mb-20">
            <div className="mb-10 text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Our values</h2>
              <p className="text-slate-500">The principles that guide every product decision we make.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {values.map((v, i) => (
                <motion.div
                  key={v.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[v.color]}`}>
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-sm leading-6 text-slate-500">{v.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-24">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900">Our journey</h2>
            </div>
            <div className="mx-auto max-w-2xl space-y-4">
              {milestones.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-600 shrink-0">{m.year}</div>
                  <p className="text-sm text-slate-600 pt-0.5">{m.event}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-24 rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-10 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Join thousands of organizations</h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">Start your free trial today and see why over 1,200 organizations trust FundCircle.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/sign-up" className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-7 py-3 text-sm font-bold text-white shadow-md shadow-sky-300/30 hover:brightness-110 transition">
                Get started free →
              </Link>
              <Link to="/support" className="rounded-xl border border-slate-200 bg-white px-7 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
                Contact us
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
