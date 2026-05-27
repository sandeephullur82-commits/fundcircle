import { motion } from "framer-motion";
import { Lock, Crown, Users, User, Check, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const roles = [
  {
    icon: Crown,
    name: "Owner",
    color: "sky",
    slug: "OWNER",
    desc: "Full administrative access. Creates the organization, invites agents and customers, manages billing, views all analytics, and controls every aspect of the workspace.",
    can: [
      "Create and manage the organization",
      "Invite / remove agents and customers",
      "View all collections and analytics",
      "Record collections on behalf of agents",
      "Manage loans and EMI schedules",
      "Access billing and subscription settings",
      "Export all reports",
      "Configure organization settings",
    ],
  },
  {
    icon: Users,
    name: "Pigmy Collector",
    color: "violet",
    slug: "AGENT",
    desc: "Field agent with access to their own assigned customers and collections. Cannot see other agents' data or any organization management features.",
    can: [
      "View assigned customers",
      "Record daily collections",
      "View their own collection history",
      "Mark pending visits as completed",
      "View customer balances (assigned only)",
    ],
    cannot: [
      "Access organization settings",
      "View other agents' collections",
      "Manage subscriptions or billing",
      "Invite new members",
      "Approve loans",
    ],
  },
  {
    icon: User,
    name: "Customer",
    color: "amber",
    slug: "CUSTOMER",
    desc: "End customer with read-only access to their own savings history, balance, and collection records. No access to other customers or organization data.",
    can: [
      "View personal savings balance",
      "View collection history",
      "View assigned agent details",
      "View loan status (if applicable)",
      "Update personal profile",
    ],
    cannot: [
      "View other customers' data",
      "Record or modify collections",
      "Access organization or agent data",
      "Access billing or reports",
    ],
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  sky: { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200" },
  violet: { bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
};

export default function RoleAccessPage() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px]">
          <div className="absolute left-1/3 top-0 h-80 w-80 rounded-full bg-amber-100/40 blur-[120px]" />
          <div className="absolute right-1/4 top-10 h-64 w-64 rounded-full bg-sky-100/40 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <section className="py-20 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5">
                <Lock className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-600">Platform — Access Control</span>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-5">Role-Based Access Control</h1>
              <p className="text-lg text-slate-500 mb-8">
                FundCircle enforces strict role-based permissions at every layer — from React route guards to Firestore security rules. Three roles, zero ambiguity.
              </p>
              <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600 transition">
                Set up your organization <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </section>

          <section className="mb-24">
            <div className="grid gap-8 md:grid-cols-3">
              {roles.map((role, i) => {
                const Icon = role.icon;
                const c = colorMap[role.color];
                return (
                  <motion.div
                    key={role.slug}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className={`rounded-3xl border-2 ${c.border} bg-white p-7 shadow-md`}
                  >
                    <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${c.bg} ${c.text}`}>
                      <Icon className="h-5.5 w-5.5" />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-slate-900">{role.name}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.bg} ${c.text}`}>{role.slug}</span>
                    </div>
                    <p className="text-sm text-slate-500 leading-6 mb-5">{role.desc}</p>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Can do</p>
                      <ul className="space-y-1.5 mb-4">
                        {role.can.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{item}
                          </li>
                        ))}
                      </ul>
                      {role.cannot && (
                        <>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Cannot do</p>
                          <ul className="space-y-1.5">
                            {role.cannot.map((item) => (
                              <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
                                <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />{item}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
