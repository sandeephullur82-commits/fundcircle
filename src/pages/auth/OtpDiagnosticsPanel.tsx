import React, { useState, useEffect, useCallback } from "react";
import { Activity, ChevronDown, ChevronUp, Clock, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface DiagnosticsData {
  type: string;
  sentAt: Date | null;
  verifiedAt: Date | null;
  requestCount: number;
  errors: Array<{ code: string; message: string; time: string }>;
  latencyMs: number | null;
}

function readDiagnostics(): DiagnosticsData {
  const sentAtStr     = sessionStorage.getItem("fc_otp_sent_at");
  const verifiedAtStr = sessionStorage.getItem("fc_otp_verified_at");
  const errorsRaw     = sessionStorage.getItem("fc_otp_errors");
  const sentAt        = sentAtStr     ? new Date(sentAtStr)     : null;
  const verifiedAt    = verifiedAtStr ? new Date(verifiedAtStr) : null;
  return {
    type:         sessionStorage.getItem("fc_otp_type") || "unknown",
    sentAt,
    verifiedAt,
    requestCount: parseInt(sessionStorage.getItem("fc_otp_request_count") || "0"),
    errors:       errorsRaw ? JSON.parse(errorsRaw) : [],
    latencyMs:    sentAt && verifiedAt ? verifiedAt.getTime() - sentAt.getTime() : null,
  };
}

function fmt(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
}

function fmtMs(ms: number): string {
  if (ms < 1000)  return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

export default function OtpDiagnosticsPanel() {
  const [open,  setOpen]  = useState(false);
  const [data,  setData]  = useState<DiagnosticsData>(readDiagnostics);
  const [elapsed, setElapsed] = useState(0);

  const refresh = useCallback(() => setData(readDiagnostics()), []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 800);
    return () => clearInterval(iv);
  }, [refresh]);

  useEffect(() => {
    if (!data.sentAt || data.verifiedAt) { setElapsed(0); return; }
    const iv = setInterval(() => setElapsed(Date.now() - data.sentAt!.getTime()), 500);
    return () => clearInterval(iv);
  }, [data.sentAt, data.verifiedAt]);

  const isDev = import.meta.env.DEV ||
    (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? "").startsWith("pk_test_");

  if (!isDev) return null;

  const status: "idle" | "waiting" | "delivered" | "error" =
    data.verifiedAt  ? "delivered" :
    data.errors.length > 0 && !data.sentAt ? "error" :
    data.sentAt      ? "waiting"  : "idle";

  const statusColors = {
    idle:      "border-white/10 bg-white/[0.04]",
    waiting:   "border-amber-500/25 bg-amber-500/[0.06]",
    delivered: "border-emerald-500/25 bg-emerald-500/[0.06]",
    error:     "border-red-500/25 bg-red-500/[0.06]",
  };

  const statusDot = {
    idle:      "bg-white/25",
    waiting:   "bg-amber-400 animate-pulse",
    delivered: "bg-emerald-400",
    error:     "bg-red-400",
  };

  return (
    <div className={`mt-4 rounded-2xl border text-xs font-mono transition-all duration-200 ${statusColors[status]}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-white/50 hover:text-white/75 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusDot[status]}`} />
          <Activity className="h-3.5 w-3.5" />
          <span className="tracking-wider uppercase text-[10px]">OTP Diagnostics</span>
          {status === "waiting" && elapsed > 0 && (
            <span className="text-amber-400/80 text-[10px]">— waiting {fmtMs(elapsed)}</span>
          )}
          {status === "delivered" && data.latencyMs !== null && (
            <span className="text-emerald-400/80 text-[10px]">— delivered in {fmtMs(data.latencyMs)}</span>
          )}
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="border-t border-white/[0.07] px-4 py-3 space-y-2.5">
          <Row label="Flow type"   value={data.type === "signup_verify" ? "Sign-up verification" : data.type === "reset_password" ? "Password reset" : data.type} />
          <Row label="OTP sent"    value={data.sentAt     ? fmt(data.sentAt)     : "—"} icon={data.sentAt ? <Clock className="h-3 w-3 text-violet-400" /> : null} />
          <Row label="OTP verified" value={data.verifiedAt ? fmt(data.verifiedAt) : "pending…"} icon={data.verifiedAt ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : null} />
          <Row label="Delivery latency" value={data.latencyMs !== null ? fmtMs(data.latencyMs) : elapsed > 0 ? `${fmtMs(elapsed)} (in flight)` : "—"} />
          <Row label="Requests sent" value={String(data.requestCount)} icon={data.requestCount > 1 ? <AlertTriangle className="h-3 w-3 text-amber-400" /> : null} />

          {data.errors.length > 0 && (
            <div className="mt-1 space-y-1">
              <p className="text-white/35 uppercase tracking-wider text-[10px]">Error log</p>
              {data.errors.slice(-3).map((e, i) => (
                <div key={i} className="flex items-start gap-1.5 rounded-lg bg-red-500/10 border border-red-500/15 px-2.5 py-1.5">
                  <XCircle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-red-300">{e.code}</span>
                    {e.message && <span className="text-white/40 ml-1">{e.message}</span>}
                    <span className="text-white/25 ml-1">{e.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-1 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2">
            <p className="text-amber-300/90 text-[10px] leading-relaxed">
              <strong>Dev instance:</strong> Clerk development keys route email through a shared sandbox server.
              Expected delivery: <strong>15–60s</strong>. For instant delivery, configure a Production Clerk instance
              with a custom SMTP provider (SendGrid, AWS SES, Postmark, etc.).
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1 text-white/30 hover:text-white/60 transition-colors text-[10px]"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/30 uppercase tracking-wider text-[10px] shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 text-white/65 text-right">
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
}
