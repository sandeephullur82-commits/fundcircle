"use client"

import React from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2, XCircle, Archive, Loader2, ShieldOff } from "lucide-react"
import { cn } from "@/lib/utils"

export type ConfirmVariant = "danger" | "warning" | "info"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant?: ConfirmVariant
  title: string
  description?: string
  details?: { label: string; value: string }[]
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  icon?: React.ReactNode
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
  iconBg: string
  iconColor: string
  confirmClass: string
  defaultIcon: React.ReactNode
}> = {
  danger: {
    iconBg: "bg-red-50 border border-red-100",
    iconColor: "text-red-500",
    confirmClass: "bg-red-600 hover:bg-red-700 text-white border-transparent focus-visible:ring-red-300",
    defaultIcon: <Trash2 className="w-5 h-5" />,
  },
  warning: {
    iconBg: "bg-amber-50 border border-amber-100",
    iconColor: "text-amber-500",
    confirmClass: "bg-amber-600 hover:bg-amber-700 text-white border-transparent focus-visible:ring-amber-300",
    defaultIcon: <ShieldOff className="w-5 h-5" />,
  },
  info: {
    iconBg: "bg-blue-50 border border-blue-100",
    iconColor: "text-blue-500",
    confirmClass: "bg-blue-600 hover:bg-blue-700 text-white border-transparent focus-visible:ring-blue-300",
    defaultIcon: <AlertTriangle className="w-5 h-5" />,
  },
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  variant = "danger",
  title,
  description,
  details = [],
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  icon,
}: ConfirmDialogProps) {
  const cfg = VARIANT_CONFIG[variant]
  const displayIcon = icon ?? cfg.defaultIcon

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="max-w-sm" showCloseButton={!loading}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn("rounded-xl p-2.5 shrink-0 mt-0.5", cfg.iconBg)}>
              <span className={cfg.iconColor}>{displayIcon}</span>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                {title}
              </DialogTitle>
              {description && (
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        {details.length > 0 && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-100 mx-1">
            {details.map((d) => (
              <div key={d.label} className="flex items-center justify-between px-4 py-2.5 gap-4">
                <span className="text-xs text-slate-500 shrink-0">{d.label}</span>
                <span className="text-xs font-semibold text-slate-800 text-right truncate">{d.value}</span>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={cn("flex-1 sm:flex-none gap-2", cfg.confirmClass)}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
