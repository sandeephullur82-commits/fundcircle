import { motion } from "framer-motion";
import { BarChart3, TrendingUp, PieChart, Activity, Calendar, Download, Filter, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const analyticsFeatures = [
  { icon: BarChart3, color: "sky", title: "Collection Overview", desc: "Daily, weekly, and monthly bar charts showing total amounts collected across all agents and customers." },
  { icon: TrendingUp, color: "emerald", title: "Growth Trends", desc: "Track collection performance over time with trend lines, percentage changes, and goal tracking." },
  { icon: PieChart, color: "violet", title: "Agent Performance", desc: "Compare collection efficiency across agents. See visit rates, missed collections, and total amounts by collector." },
  { icon: Activity, color: "sky", title: "Realtime Updates", desc: "All metrics update instantly via Firestore listeners. No page refresh needed — data is always current." },
  { icon: Calendar, color: "amber", title: "Date Range Filters", desc: "Filter any report by custom date ranges. Compare this week vs last week, or this month vs last year." },
  { icon: Download, color: "emerald", title: "Export Reports", desc: "Download collection reports in CSV or Excel format. Schedule automatic daily reports to your inbox." },
  { icon: Filter, color: "violet", title: "Custom Filters", desc: "Drill down by agent, customer, collection area, date, or amount range to surface the insights you need." },
  { icon: RefreshCw, color: "sky", title: "Live Dashboards", desc: "Owner and agent dashboards auto-refresh using onSnapshot listeners — decisions made on live data." },
];

const colorMap: Record<string, string> = {
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

const stats = [
  { value: "< 100ms", label: "Dashboard update time" },
  { value: "100%", label: "Realtime accuracy" },
  { value: "12+", label: "Report types" },
  { value: "Unlimited", label: "Historical data storage" },
];

export default function AnalyticsPage() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[450px]">
          <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-emerald-100/50 blur-[120px]" />
          <div className="absolute right-1/4 top-16 h-72 w-72 rounded-full bg-sky-100/50 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <section className="py-20 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-500 mb-4">Analytics</p>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-5">Realtime insights for every<br className="hidden sm:block" />collection operation</h1>
              <p className="mx-auto max-w-xl text-lg text-slate-500 mb-8">
                Every transaction is reflected instantly in your dashboards. Make data-driven decisions with live Firestore-powered analytics.
              </p>
              <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-sky-300/30 hover:brightness-110 transition">
                View live demo →
              </Link>
            </motion.div>
          </section>

          <section className="mb-16">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm"
                >
                  <p className="text-2xl font-extrabold text-sky-600 mb-1">{s.value}</p>
                  <p className="text-xs font-medium text-slate-500">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="pb-24">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Comprehensive analytics tools</h2>
              <p className="text-slate-500">Every feature is powered by Firestore realtime listeners — no separate analytics infrastructure needed.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {analyticsFeatures.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[f.color]}`}>
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1.5">{f.title}</h3>
                  <p className="text-xs leading-5 text-slate-500">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
