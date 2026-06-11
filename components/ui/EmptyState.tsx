import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  className?: string
  compact?: boolean
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-14 px-6",
        className
      )}
    >
      {icon && (
        <div className="mb-3 rounded-2xl bg-slate-100 p-4 text-slate-400">
          {icon}
        </div>
      )}
      <p className={cn("font-semibold text-slate-700", compact ? "text-sm" : "text-base")}>
        {title}
      </p>
      {description && (
        <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <Button
          size="sm"
          onClick={action.onClick}
          className="mt-4 gap-1.5"
        >
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  )
}
