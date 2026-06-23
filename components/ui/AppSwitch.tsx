import React from "react";

interface AppSwitchProps {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  id?: string;
}

export default function AppSwitch({
  value,
  onChange,
  disabled = false,
  ariaLabel,
  id,
}: AppSwitchProps) {
  const toggle = () => {
    if (!disabled) onChange(!value);
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={toggle}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !disabled) {
          e.preventDefault();
          toggle();
        }
      }}
      className="inline-flex items-center justify-center shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 rounded-full"
      style={{
        minHeight: 44,
        minWidth: 52,
        padding: 0,
        background: "none",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Track */}
      <span
        style={{
          position: "relative",
          display: "block",
          width: 52,
          height: 30,
          borderRadius: 9999,
          backgroundColor: value ? "#0EA5E9" : "#E5E7EB",
          transition: "background-color 200ms ease",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {/* Knob — pixel-exact so it never overflows the track */}
        <span
          style={{
            position: "absolute",
            top: 3,
            left: 3,
            width: 24,
            height: 24,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.20), 0 1px 2px rgba(0,0,0,0.12)",
            transition: "transform 200ms ease",
            transform: value ? "translateX(22px)" : "translateX(0px)",
            willChange: "transform",
          }}
        />
      </span>
    </button>
  );
}
