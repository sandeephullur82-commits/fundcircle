import { motion } from "framer-motion";
import { ShieldCheck, Key, Users, Mail, Smartphone, Lock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PublicLayout from "@/components/PublicLayout";

const features = [
  { icon: Mail, title: "Email + OTP Verification", desc: "New users verify their email via a one-time passcode before gaining access. No fake accounts." },
  { icon: Key, title: "Google OAuth", desc: "Sign in with Google for a one-click authentication experience without managing passwords." },
  { icon: Users, title: "Organization Management", desc: "Clerk organizations map directly to FundCircle workspaces. Each org has isolated membership and roles." },
  { icon: Lock, title: "Role-Based Tokens", desc: "Clerk issues JWT tokens scoped to the active organization, carrying the user's role in the token payload." },
  { icon: Smartphone, title: "Session Management", desc: "Secure, short-lived sessions with automatic refresh. Users stay logged in across devices until they sign out." },
  { icon: ShieldCheck, title: "Development & Production Keys", desc: "Separate Clerk publishable keys for development and production environments prevent accidental data mixing." },
];

export default function ClerkAuthPage() {
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px]">
          <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-sky-100/50 blur-[120px]" />
          <div className="absolute right-1/3 top-10 h-64 w-64 rounded-full bg-violet-100/40 blur-[100px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <section className="py-20 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                <span className="text-xs font-bold text-sky-600">Platform — Authentication</span>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-5">Clerk Authentication</h1>
              <p className="text-lg text-slate-500 mb-8">
                FundCircle uses Clerk to power enterprise-grade authentication, organization management, and role-based access control — without building any of it from scratch.
              </p>
              <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-bold text-white hover:bg-sky-600 transition">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </section>

          <section className="pb-16">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.06 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-6">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="mb-24 rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <h2 className="text-xl font-bold text-slate-900 mb-5">How auth works in FundCircle</h2>
            <ol className="space-y-4">
              {[
                { step: "1", title: "User registers at /sign-up", desc: "Clerk collects name, email, and password. An OTP is sent to verify the email address." },
                { step: "2", title: "OTP verification", desc: "User enters the 6-digit code from their email. Only after verification does the session begin." },
                { step: "3", title: "Organization onboarding", desc: "New owners are redirected to the onboarding wizard to create their organization in Clerk and Firestore." },
                { step: "4", title: "Role assignment", desc: "The owner's membership document is saved with role=OWNER. Invited agents and customers receive role=AGENT or CUSTOMER." },
                { step: "5", title: "Dashboard access", desc: "On every login, the auth callback reads the Firestore membership role and routes users to their specific dashboard." },
              ].map((item) => (
                <li key={item.step} className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">{item.step}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 mb-0.5">{item.title}</p>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
