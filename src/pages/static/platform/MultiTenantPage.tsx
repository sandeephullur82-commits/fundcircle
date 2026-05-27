import { motion } from "framer-motion";
import { Layers, Lock, Building2, Shield, Users, Database, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const principles = [
  { icon: Lock, title: "Data Isolation", desc: "Every Firestore query is automatically scoped to the current organization. No cross-tenant data leakage is architecturally possible." },
  { icon: Building2, title: "Organization Scoping", desc: "Clerk organizations map 1:1 to FundCircle workspaces. Users can only access the org they belong to." },
  { icon: Shield, title: "Firestore Security Rules", desc: "Rules verify the authenticated user's organization ID matches the document's organizationId field before allowing reads or writes." },
  { icon: Users, title: "Per-Tenant Roles", desc: "OWNER, AGENT, and CUSTOMER roles are scoped to specific organizations. A user's role in one org has no effect in another." },
  { icon: Database, title: "Shared Infrastructure", desc: "All organizations share the same Firestore database and Clerk tenant — isolation is enforced logically, not physically, for cost efficiency." },
  { icon: Layers, title: "Horizontal Scaling", desc: "Adding new organizations has zero impact on existing ones. Firestore's document-based model scales naturally." },
];

export default function MultiTenantPage() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px]">
          <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-violet-100/50 blur-[120px]" />
          <div className="absolute right-1/3 top-10 h-64 w-64 rounded-full bg-sky-100/40 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <section className="py-20 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5">
                <Layers className="h-4 w-4 text-violet-600" />
                <span className="text-xs font-bold text-violet-600">Platform — Architecture</span>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-5">Multi-Tenant Architecture</h1>
              <p className="text-lg text-slate-500 mb-8">
                FundCircle is built as a multi-tenant SaaS platform where every organization operates in a completely isolated workspace — sharing infrastructure while maintaining strict data separation.
              </p>
              <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-3 text-sm font-bold text-white hover:bg-violet-600 transition">
                Create your workspace <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </section>

          <section className="mb-16">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {principles.map((p, i) => (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{p.title}</h3>
                  <p className="text-sm text-slate-500 leading-6">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-24 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-5">How isolation is enforced</h2>
            <div className="space-y-4">
              {[
                { layer: "Clerk", detail: "Organization IDs are embedded in session tokens. The active organization context is enforced on every API call." },
                { layer: "Firestore Rules", detail: "All documents have an organizationId field. Security rules verify request.auth.token.org_id === resource.data.organizationId." },
                { layer: "React Hooks", detail: "useCollectionRealtime() automatically appends where('organizationId', '==', orgId) to every query." },
                { layer: "Route Guards", detail: "RoleProtectedRoute verifies the user's Firestore membership document before rendering any dashboard." },
              ].map((item) => (
                <div key={item.layer} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="rounded-lg bg-violet-100 px-3 py-1 text-xs font-bold text-violet-600 shrink-0 mt-0.5">{item.layer}</div>
                  <p className="text-sm text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
