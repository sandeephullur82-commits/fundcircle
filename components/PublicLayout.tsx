import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Analytics", href: "/analytics" },
  { label: "Blog", href: "/blog" },
];

const FOOTER_PRODUCT = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Analytics", href: "/analytics" },
  { label: "Reports", href: "/reports" },
];

const FOOTER_PLATFORM = [
  { label: "Clerk Auth", href: "/platform/clerk-auth" },
  { label: "Firestore", href: "/platform/firestore" },
  { label: "Multi-Tenant", href: "/platform/multi-tenant" },
  { label: "Role Access", href: "/platform/role-access" },
];

const FOOTER_COMPANY = [
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Careers", href: "/careers" },
  { label: "Support", href: "/support" },
];

export function PublicNavbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isSignedIn } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 focus:outline-none">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 text-white font-bold text-sm shadow-md shadow-sky-300/30">
            FC
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">FundCircle</p>
            <p className="text-sm font-bold text-slate-900 leading-tight">Enterprise Collection Platform</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                pathname === link.href ? "bg-sky-50 text-sky-600" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <button
              onClick={() => navigate("/router")}
              className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-300/30 transition hover:brightness-110"
            >
              Dashboard →
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate("/workspace-selection")}
                className="hidden sm:block rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/sign-up")}
                className="rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-sky-300/30 transition hover:brightness-110 flex items-center gap-1.5"
              >
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 pb-4 pt-2">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  pathname === link.href ? "bg-sky-50 text-sky-600" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!isSignedIn && (
              <Link
                to="/workspace-selection"
                onClick={() => setMobileOpen(false)}
                className="mt-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-700 text-center"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-5">
          <div className="sm:col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">FC</div>
              <span className="font-bold text-slate-900">FundCircle</span>
            </Link>
            <p className="text-sm leading-6 text-slate-500 mb-4">
              Enterprise pigmy collection platform built on Clerk and Firestore.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-900 mb-4">Product</h3>
            <ul className="space-y-2.5">
              {FOOTER_PRODUCT.map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-900 mb-4">Platform</h3>
            <ul className="space-y-2.5">
              {FOOTER_PLATFORM.map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-900 mb-4">Company</h3>
            <ul className="space-y-2.5">
              {FOOTER_COMPANY.map((l) => (
                <li key={l.href}>
                  <Link to={l.href} className="text-sm text-slate-500 hover:text-slate-900 transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-slate-900 mb-4">Legal</h3>
            <ul className="space-y-2.5">
              <li><Link to="/privacy-policy" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">© 2026 FundCircle. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-slate-400">
            <Link to="/privacy-policy" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-slate-700 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

interface PublicLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function PublicLayout({ children, className = "" }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <PublicNavbar />
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex-1 ${className}`}
      >
        {children}
      </motion.main>
      <PublicFooter />
    </div>
  );
}
