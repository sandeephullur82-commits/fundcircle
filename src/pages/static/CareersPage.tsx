import { motion } from "framer-motion";
import { MapPin, Briefcase, ArrowRight, Heart, Zap, Globe, Coffee } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const openings = [
  { title: "Senior Full-Stack Engineer", team: "Engineering", location: "Remote / Bengaluru", type: "Full-time", color: "sky" },
  { title: "React Native Developer", team: "Mobile", location: "Remote", type: "Full-time", color: "violet" },
  { title: "Firebase / Firestore Engineer", team: "Backend", location: "Remote / Bengaluru", type: "Full-time", color: "emerald" },
  { title: "Product Designer (UI/UX)", team: "Design", location: "Remote", type: "Full-time", color: "amber" },
  { title: "Growth & Partnerships Manager", team: "Business", location: "Bengaluru", type: "Full-time", color: "sky" },
  { title: "Customer Success Specialist", team: "Support", location: "Remote / Bengaluru", type: "Full-time", color: "violet" },
];

const perks = [
  { icon: Heart, title: "Health coverage", desc: "Comprehensive medical, dental, and vision insurance for you and your family." },
  { icon: Zap, title: "Fast growth", desc: "Join a growing startup and take ownership of critical parts of the product." },
  { icon: Globe, title: "Remote first", desc: "Work from anywhere in India. Optional access to our Bengaluru office." },
  { icon: Coffee, title: "Learning budget", desc: "₹50,000/year for courses, conferences, and books of your choice." },
];

const colorMap: Record<string, string> = {
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

export default function CareersPage() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px]">
          <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-violet-100/40 blur-[120px]" />
          <div className="absolute right-1/3 top-10 h-64 w-64 rounded-full bg-sky-100/40 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <section className="py-20 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-500 mb-4">Careers at FundCircle</p>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-5">Help us digitize daily savings<br className="hidden sm:block" />collection for all of India</h1>
              <p className="mx-auto max-w-xl text-lg text-slate-500 mb-8">
                We're a small, ambitious team building enterprise-grade fintech for one of India's largest informal financial sectors. Come build with us.
              </p>
              <a href="mailto:careers@fundcircle.in" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-violet-300/30 hover:brightness-110 transition">
                See open roles below ↓
              </a>
            </motion.div>
          </section>

          <section className="mb-16">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {perks.map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p.icon className="mb-3 h-6 w-6 text-sky-500" />
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{p.title}</h3>
                  <p className="text-xs text-slate-500 leading-5">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-24">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Open positions</h2>
              <p className="text-slate-500 text-sm">{openings.length} roles currently open</p>
            </div>
            <div className="space-y-3">
              {openings.map((job, i) => (
                <motion.div
                  key={job.title}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-sky-200 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colorMap[job.color]}`}>
                      <Briefcase className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">{job.title}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-slate-400">{job.team}</span>
                        <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3 w-3" />{job.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">{job.type}</span>
                    <a
                      href={`mailto:careers@fundcircle.in?subject=Application: ${job.title}`}
                      className="flex items-center gap-1 rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-600 hover:bg-sky-100 transition"
                    >
                      Apply <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500 mb-2">Don't see your role? We're always open to talented people.</p>
              <a href="mailto:careers@fundcircle.in" className="text-sm font-bold text-sky-600 hover:underline">Send us your resume →</a>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
