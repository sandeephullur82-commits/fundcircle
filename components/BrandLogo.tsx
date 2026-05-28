import React from "react";

/**
 * BrandMark — compact logo for navbars, sidebars, headers.
 * Renders the transparent logo image directly — no background wrapper.
 */
export function BrandMark({
  size = "md",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const heights: Record<string, string> = {
    xs: "h-7",
    sm: "h-10",
    md: "h-14",
    lg: "h-16",
  };
  return (
    <img
      src="/fundcircle-logo-full.png"
      alt="FundCircle"
      className={`${heights[size]} w-auto object-contain shrink-0 ${className}`}
      draggable={false}
    />
  );
}

/**
 * BrandLogo — full-size logo for dark-background pages (auth, splash, onboarding).
 */
interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const logoHeights: Record<string, string> = {
  sm: "h-16",
  md: "h-24",
  lg: "h-32",
};

export default function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  return (
    <div className={`flex justify-center ${className}`}>
      <img
        src="/fundcircle-logo-full.png"
        alt="FundCircle"
        className={`${logoHeights[size]} w-auto object-contain`}
        draggable={false}
      />
    </div>
  );
}
