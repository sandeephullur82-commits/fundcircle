import React from "react";

const CIRCLE_GRADIENT: React.CSSProperties = {
  background: "linear-gradient(90deg, #00d4ff 0%, #3b82f6 45%, #7c3aed 75%, #d946ef 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

/**
 * Inline brand mark: "Fund" + gradient "Circle"
 * Use this in navbars, sidebars, compact headers.
 */
export function BrandMark({
  className = "text-xl font-extrabold",
  fundClassName = "text-white",
}: {
  className?: string;
  fundClassName?: string;
}) {
  return (
    <span className={`tracking-tight leading-none ${className}`}>
      <span className={fundClassName}>Fund</span>
      <span style={CIRCLE_GRADIENT}>Circle</span>
    </span>
  );
}

/**
 * Full brand block: large "FundCircle" + optional subtitle.
 * Use this in auth pages, onboarding, and invite pages.
 */
interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  /** "dark" = white "Fund" (for dark backgrounds). "light" = slate "Fund" */
  variant?: "dark" | "light";
  subtitle?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { logo: "text-3xl font-black",  sub: "text-[10px] tracking-[5px]" },
  md: { logo: "text-4xl font-black",  sub: "text-xs tracking-[5px]" },
  lg: { logo: "text-5xl font-black",  sub: "text-sm tracking-[6px]" },
};

export default function BrandLogo({
  size = "md",
  variant = "dark",
  subtitle = false,
  className = "",
}: BrandLogoProps) {
  const s = sizeMap[size];
  const fundColor = variant === "dark" ? "text-white" : "text-slate-900";

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className={`${s.logo} leading-none tracking-tight`}>
        <span className={fundColor}>Fund</span>
        <span style={CIRCLE_GRADIENT}>Circle</span>
      </div>
      {subtitle && (
        <p className={`${s.sub} uppercase font-medium text-white/55 mt-1`}>
          Enterprise Collection Platform
        </p>
      )}
    </div>
  );
}
