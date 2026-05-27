import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const posts = [
  {
    slug: "realtime-collection-management",
    title: "How Realtime Sync Is Transforming Daily Pigmy Collections",
    excerpt: "Explore how Firestore onSnapshot listeners eliminate the lag between field agents and office dashboards — enabling instant reconciliation.",
    category: "Product",
    date: "May 20, 2026",
    readTime: "5 min read",
    color: "sky",
  },
  {
    slug: "multi-tenant-architecture-firestore",
    title: "Building Multi-Tenant SaaS on Firestore: Lessons Learned",
    excerpt: "A deep dive into how we architected per-organization data isolation using Firestore security rules and Clerk organization context.",
    category: "Engineering",
    date: "May 12, 2026",
    readTime: "8 min read",
    color: "violet",
  },
  {
    slug: "agent-field-experience",
    title: "Designing for the Field: The Agent Mobile Experience",
    excerpt: "How we optimized FundCircle's agent dashboard for low-connectivity environments and one-handed phone use in the field.",
    category: "Design",
    date: "May 5, 2026",
    readTime: "4 min read",
    color: "emerald",
  },
  {
    slug: "clerk-rbac-pigmy",
    title: "Role-Based Access Control in Financial SaaS with Clerk",
    excerpt: "Implementing Owner, Collector, and Customer roles in a multi-tenant app using Clerk organizations and custom Firestore rules.",
    category: "Engineering",
    date: "Apr 28, 2026",
    readTime: "6 min read",
    color: "amber",
  },
  {
    slug: "emi-loan-management",
    title: "Adding Loan and EMI Management to FundCircle",
    excerpt: "How we built the loan disbursement, EMI schedule computation, and payment tracking feature from the ground up.",
    category: "Product",
    date: "Apr 15, 2026",
    readTime: "7 min read",
    color: "sky",
  },
  {
    slug: "india-fintech-collection",
    title: "The State of Pigmy Collections in India's Cooperative Banking Sector",
    excerpt: "An industry overview of how daily collection schemes operate across Karnataka, Tamil Nadu, and Maharashtra — and the opportunity to digitize.",
    category: "Industry",
    date: "Apr 2, 2026",
    readTime: "9 min read",
    color: "violet",
  },
];

const categories = ["All", "Product", "Engineering", "Design", "Industry"];

const colorMap: Record<string, string> = {
  sky: "bg-sky-50 text-sky-600 border-sky-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
};

export default function BlogPage() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px]">
          <div className="absolute left-1/4 top-0 h-72 w-72 rounded-full bg-sky-100/50 blur-[100px]" />
          <div className="absolute right-1/3 top-10 h-64 w-64 rounded-full bg-violet-100/40 blur-[90px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <section className="py-20 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-500 mb-4">The FundCircle Blog</p>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-4">Insights for modern collection operations</h1>
              <p className="mx-auto max-w-xl text-lg text-slate-500">
                Product updates, engineering deep dives, and industry perspectives on digital collection management.
              </p>
            </motion.div>
          </section>

          <section className="pb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button key={cat} className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition ${cat === "All" ? "bg-sky-500 text-white border-sky-500" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </section>

          <section className="pb-24">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <motion.article
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorMap[post.color]}`}>
                      <Tag className="h-3 w-3" />{post.category}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900 mb-2 leading-snug group-hover:text-sky-600 transition-colors">{post.title}</h2>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{post.date}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{post.readTime}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
