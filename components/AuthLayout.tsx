import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const displayRoleName = (role: string | null) => {
  switch (role) {
    case "owner":
      return "Owner";
    case "pigmy_collector":
      return "Pigmy Collector";
    case "customer":
      return "Customer";
    default:
      return "Owner";
  }
};

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  features: string[];
  ctaText: string;
  ctaLink: string;
  ctaRoleLabel: string;
  children: React.ReactNode;
}

export default function AuthLayout({
  title,
  subtitle,
  features,
  ctaText,
  ctaLink,
  ctaRoleLabel,
  children,
}: AuthLayoutProps) {
  const [selectedRole, setSelectedRole] = useState<string>("Owner");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("preferredLoginRole");
    setSelectedRole(displayRoleName(stored));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-sky-100 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl lg:rounded-[2rem] border border-white/70 bg-white/90 shadow-2xl shadow-slate-200/50 backdrop-blur-xl">
          <div className="grid lg:grid-cols-[1fr_1.2fr]">
            {/* Left dark panel — hidden on mobile */}
            <div className="hidden lg:flex flex-col bg-slate-950/95 p-10 text-white xl:p-12">
              <div className="inline-flex items-center gap-3 rounded-3xl bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100 w-fit">
                <Sparkles className="h-4 w-4" /> Premium FundCircle access
              </div>
              <div className="mt-8 space-y-6">
                <h1 className="text-3xl font-semibold tracking-tight text-white xl:text-4xl">{title}</h1>
                <p className="text-base leading-7 text-slate-200">{subtitle}</p>
              </div>
              <div className="mt-8 space-y-4">
                {features.map((feature) => (
                  <div key={feature} className="rounded-3xl bg-white/10 p-4 text-sm text-slate-100 shadow-sm shadow-slate-900/10">
                    {feature}
                  </div>
                ))}
              </div>
              <div className="mt-10 rounded-3xl bg-white/8 border border-white/15 p-4 text-sm text-slate-200">
                <p className="font-semibold text-white">Selected workspace</p>
                <p className="mt-2 text-lg">{selectedRole}</p>
              </div>
            </div>

            {/* Right form panel */}
            <div className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
              <div className="w-full max-w-md">
                {/* Logo shown only on mobile (left panel is hidden) */}
                <div className="lg:hidden flex items-center gap-3 mb-6">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 text-white font-bold text-sm shadow-md shrink-0">
                    FC
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">FundCircle</p>
                    <p className="text-sm font-bold text-slate-900">Enterprise Collection Platform</p>
                  </div>
                </div>
                {children}
                <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
                  <p>{ctaText}</p>
                  <Link to={ctaLink} className="font-semibold text-slate-950 hover:text-slate-800">
                    {ctaRoleLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
