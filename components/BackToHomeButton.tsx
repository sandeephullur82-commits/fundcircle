import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackToHomeButtonProps {
  dark?: boolean;
}

export default function BackToHomeButton({ dark = true }: BackToHomeButtonProps) {
  return (
    <Link
      to="/"
      aria-label="Back to FundCircle"
      className={[
        "inline-flex items-center gap-2 rounded-full px-4 py-2",
        "text-sm font-medium transition-all duration-200 cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        dark
          ? [
              "border border-white/20 bg-white/[0.08] backdrop-blur-sm",
              "text-white/90",
              "hover:border-white/35 hover:bg-white/[0.14] hover:text-white",
              "active:scale-[0.97]",
              "focus-visible:ring-white/30 focus-visible:ring-offset-transparent",
            ].join(" ")
          : "border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-50 focus-visible:ring-slate-400",
      ].join(" ")}
    >
      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
      <span>Back to FundCircle</span>
    </Link>
  );
}
