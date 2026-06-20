import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

interface AuthLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
  hideBackButton?: boolean;
}

export default function AuthLayout({ children, maxWidth = "max-w-[440px]", hideBackButton = false }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[oklch(0.208_0.042_265.755)] flex flex-col items-center justify-center p-4 relative overflow-x-hidden">
      <div className="pointer-events-none absolute -top-48 -left-40 h-[650px] w-[650px] rounded-full bg-violet-700/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-40 h-[550px] w-[550px] rounded-full bg-blue-600/18 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[320px] w-[320px] rounded-full bg-indigo-500/8 blur-[90px]" />

      {!hideBackButton && (
        <Link
          to="/"
          aria-label="Back to FundCircle"
          className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 text-sm font-medium text-white/50 hover:text-white/90 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span>Back to FundCircle</span>
        </Link>
      )}

      <div className={`relative z-10 w-full ${maxWidth}`}>
        <div className="flex justify-center mb-5">
          <BrandLogo size="md" />
        </div>
        {children}
      </div>
    </div>
  );
}
