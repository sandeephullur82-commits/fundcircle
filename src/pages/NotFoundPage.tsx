import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Home, Search } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <PublicLayout>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/4 top-10 h-72 w-72 rounded-full bg-sky-100/60 blur-[100px]" />
          <div className="absolute right-1/4 bottom-10 h-64 w-64 rounded-full bg-violet-100/60 blur-[90px]" />
        </div>
        <div className="relative mx-auto max-w-2xl px-4 py-28 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-violet-500 mb-4 leading-none">404</p>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">Page not found</h1>
            <p className="text-base text-slate-500 mb-10 max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Go Back
              </button>
              <Link
                to="/"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-300/30 transition hover:brightness-110"
              >
                <Home className="w-4 h-4" /> Back to Home
              </Link>
            </div>

            <div className="mt-14 grid sm:grid-cols-3 gap-4 text-left">
              {[
                { label: "Features", href: "/features", desc: "Explore all platform capabilities" },
                { label: "Pricing", href: "/pricing", desc: "View plans and pricing" },
                { label: "Support", href: "/support", desc: "Get help from our team" },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-sky-200 hover:shadow-md transition-all group"
                >
                  <p className="text-sm font-bold text-slate-800 group-hover:text-sky-600 transition-colors">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </PublicLayout>
  );
}
