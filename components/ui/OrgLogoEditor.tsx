import React, { useRef, useState } from "react";
import { useOrganization, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { Camera, Trash2, Loader2, Building2 } from "lucide-react";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

async function compressImage(file: File, maxDim = 512, maxBytes = 300 * 1024): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
        else        { w = Math.round((w * maxDim) / h); h = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return; }
        if (blob.size <= maxBytes) {
          resolve(new File([blob], "logo.webp", { type: "image/webp" }));
        } else {
          canvas.toBlob(
            (b2) => resolve(b2 ? new File([b2], "logo.jpg", { type: "image/jpeg" }) : file),
            "image/jpeg", 0.78,
          );
        }
      }, "image/webp", 0.85);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

interface OrgLogoEditorProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-16 h-16", text: "text-xl",  rounded: "rounded-2xl", icon: "w-6 h-6", cam: "w-6 h-6 -bottom-1.5 -right-1.5", camIcon: "w-3 h-3"   },
  md: { container: "w-20 h-20", text: "text-2xl", rounded: "rounded-2xl", icon: "w-8 h-8", cam: "w-7 h-7 -bottom-1.5 -right-1.5", camIcon: "w-3.5 h-3.5" },
  lg: { container: "w-24 h-24", text: "text-3xl", rounded: "rounded-3xl", icon: "w-9 h-9", cam: "w-8 h-8 -bottom-2 -right-2",     camIcon: "w-4 h-4"   },
  xl: { container: "w-32 h-32", text: "text-4xl", rounded: "rounded-3xl", icon: "w-12 h-12",cam: "w-9 h-9 -bottom-2 -right-2",   camIcon: "w-4.5 h-4.5"},
};

export default function OrgLogoEditor({ size = "lg", className = "" }: OrgLogoEditorProps) {
  const { organization } = useOrganization();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const sz = sizeMap[size];
  const hasLogo = !!organization?.imageUrl;
  const isLoading = uploading || removing;
  const orgInitial = (organization?.name || "O").charAt(0).toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !organization) return;

    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Logo must be smaller than 5 MB.");
      return;
    }

    setUploading(true);
    const t = toast.loading("Uploading logo…");
    try {
      const compressed = await compressImage(file);
      await organization.setLogo({ file: compressed });
      toast.success("Organization logo updated!", { id: t });
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.longMessage || err?.message || "Upload failed.", { id: t });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!organization || !hasLogo || !user) return;
    setRemoving(true);
    const t = toast.loading("Removing logo…");
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch("/api/remove-org-logo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ organizationId: organization.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove logo");
      }
      toast.success("Organization logo removed.", { id: t });
    } catch (err: any) {
      toast.error(err?.message || "Remove failed.", { id: t });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className={`${sz.container} ${sz.rounded} overflow-hidden shrink-0 ring-2 ring-black/5 relative`}>
          {isLoading ? (
            <div className={`${sz.container} flex items-center justify-center bg-black/30 absolute inset-0 z-10`}>
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          ) : null}

          {organization?.imageUrl ? (
            <img
              src={organization.imageUrl}
              alt={organization.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`${sz.container} ${sz.rounded} bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white font-black select-none ${sz.text}`}>
              {orgInitial}
            </div>
          )}
        </div>

        {/* Camera button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          title="Upload logo (JPG, PNG, WebP · max 5 MB)"
          aria-label="Change organization logo"
          className={`absolute ${sz.cam} bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-md ring-2 ring-white transition-colors`}
        >
          <Camera className={sz.camIcon} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="text-xs font-semibold text-sky-600 hover:text-sky-700 disabled:opacity-50 transition-colors"
        >
          {hasLogo ? "Change Logo" : "Upload Logo"}
        </button>

        {hasLogo && !isLoading && (
          <>
            <span className="text-slate-200">|</span>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </>
        )}
      </div>

      <p className="text-[11px] text-slate-400 text-center">
        JPG, PNG, WebP · max 5 MB · square recommended
      </p>
    </div>
  );
}
