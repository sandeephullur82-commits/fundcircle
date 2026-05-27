import { useState } from "react";
import { motion } from "framer-motion";
import { Check, HelpCircle, Zap, Star, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const plans = [
  {
    id: "starter",
    name: "Starter",
    icon: Zap,
    monthlyPrice: 499,
    yearlyPrice: 4990,
    desc: "Perfect for small chit fund groups and cooperatives getting started.",
    color: "sky",
    features: [
      "1 organization workspace",
      "Up to 5 Pigmy Collectors",
      "Up to 100 customers",
      "Realtime Firestore sync",
      "Basic analytics dashboard",
      "CSV export reports",
      "Email support",
      "Clerk authentication",
    ],
    notIncluded: ["Loan & EMI management", "Custom integrations", "Priority support"],
  },
  {
    id: "professional",
    name: "Professional",
    icon: Star,
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    desc: "For growing collection businesses that need advanced analytics and loan management.",
    color: "violet",
    popular: true,
    features: [
      "1 organization workspace",
      "Up to 25 Pigmy Collectors",
      "Up to 1,000 customers",
      "Realtime Firestore sync",
      "Advanced analytics + trends",
      "CSV + Excel exports",
      "Loan & EMI management",
      "SMS notifications",
      "Priority support",
    ],
    notIncluded: ["Custom integrations", "Dedicated account manager"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Crown,
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    desc: "For large cooperative banks, NBFCs, and multi-branch collection operations.",
    color: "amber",
    features: [
      "Unlimited organizations",
      "Unlimited Pigmy Collectors",
      "Unlimited customers",
      "Realtime Firestore sync",
      "Full analytics suite",
      "All export formats",
      "Loan & EMI management",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "Custom onboarding",
    ],
    notIncluded: [],
  },
];

const faqs = [
  { q: "Is there a free trial?", a: "Yes! Every plan starts with a 14-day free trial. No credit card required to get started." },
  { q: "Can I change plans later?", a: "Absolutely. You can upgrade or downgrade your plan at any time from your owner dashboard. Changes take effect immediately." },
  { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards. Yearly plans can also be paid via bank transfer." },
  { q: "Is my data secure?", a: "All data is stored in Google Firestore with per-organization security rules. Authentication is powered by Clerk with enterprise-grade encryption." },
  { q: "How does multi-tenant isolation work?", a: "Each organization's data is completely isolated using Firestore security rules. No organization can access another's data." },
  { q: "Do agents and customers need to pay?", a: "No. Only the organization owner needs a plan. Agents and customers access the platform for free within your plan's limits." },
];

const colorStyles: Record<string, { badge: string; btn: string; border: string }> = {
  sky: { badge: "bg-sky-50 text-sky-600", btn: "bg-sky-500 hover:bg-sky-600", border: "border-sky-300" },
  violet: { badge: "bg-violet-50 text-violet-600", btn: "bg-violet-500 hover:bg-violet-600", border: "border-violet-400" },
  amber: { badge: "bg-amber-50 text-amber-600", btn: "bg-amber-500 hover:bg-amber-600", border: "border-amber-300" },
};

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px]">
          <div className="absolute left-1/3 top-0 h-80 w-80 rounded-full bg-violet-100/50 blur-[120px]" />
          <div className="absolute right-1/3 top-10 h-64 w-64 rounded-full bg-sky-100/50 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <section className="py-20 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-500 mb-4">Simple Pricing</p>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-4">Plans for every scale</h1>
              <p className="mx-auto max-w-xl text-lg text-slate-500 mb-8">Start free, scale as you grow. No hidden fees, no setup costs.</p>
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                  <button onClick={() => setBilling("monthly")} className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${billing === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Monthly</button>
                  <button onClick={() => setBilling("yearly")} className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition-all ${billing === "yearly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                    Yearly <span className="text-emerald-600 text-xs font-bold">Save 17%</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </section>

          <section className="pb-20">
            <div className="grid gap-8 md:grid-cols-3">
              {plans.map((plan, i) => {
                const Icon = plan.icon;
                const price = billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
                const styles = colorStyles[plan.color];
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className={`relative rounded-3xl border-2 bg-white p-8 shadow-lg ${plan.popular ? `${styles.border} shadow-violet-200/50` : "border-slate-200"}`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-4 py-1 text-xs font-bold text-white">
                        Most Popular
                      </div>
                    )}
                    <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${styles.badge}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h2>
                    <p className="text-sm text-slate-400 mb-5">{plan.desc}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-extrabold text-slate-900">₹{price.toLocaleString()}</span>
                      <span className="text-sm text-slate-400">/{billing === "monthly" ? "mo" : "yr"}</span>
                    </div>
                    <Link
                      to="/sign-up"
                      className={`mb-7 block w-full rounded-xl py-3 text-center text-sm font-bold text-white transition ${styles.btn}`}
                    >
                      Start free trial
                    </Link>
                    <ul className="space-y-2.5 mb-5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{f}
                        </li>
                      ))}
                      {plan.notIncluded.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-slate-300 line-through">
                          <span className="mt-0.5 h-4 w-4 shrink-0 text-slate-200">×</span>{f}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </section>

          <section className="pb-24">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Frequently asked questions</h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex items-start gap-3">
                      <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
                      <div>
                        <p className="font-semibold text-slate-900 mb-1">{faq.q}</p>
                        <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
