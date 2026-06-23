import React, { useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Camera, Trash2, Loader2 } from "lucide-react";

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
          resolve(new File([blob], "profile.webp", { type: "image/webp" }));
        } else {
          canvas.toBlob(
            (b2) => resolve(b2 ? new File([b2], "profile.jpg", { type: "image/jpeg" }) : file),
            "image/jpeg", 0.78,
          );
        }
      }, "image/webp", 0.85);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

interface ProfileAvatarEditorProps {
  fallbackLetter?: string;
  accentColor?: "sky" | "emerald" | "violet" | "indigo";
  size?: "sm" | "md" | "lg" | "xl";
  membershipId?: string | null;
  userId?: string;
  className?: string;
}

const sizeMap = {
  sm: { container: "w-16 h-16", text: "text-xl"  },
  md: { container: "w-20 h-20", text: "text-2xl" },
  lg: { container: "w-24 h-24", text: "text-3xl" },
  xl: { container: "w-28 h-28", text: "text-4xl" },
};

const accentMap = {
  sky:     { bg: "bg-sky-600",     ring: "ring-sky-100"     },
  emerald: { bg: "bg-emerald-600", ring: "ring-emerald-100" },
  violet:  { bg: "bg-violet-600",  ring: "ring-violet-100"  },
  indigo:  { bg: "bg-indigo-600",  ring: "ring-indigo-100"  },
};

export default function ProfileAvatarEditor({
  fallbackLetter = "U",
  accentColor = "sky",
  size = "lg",
  membershipId,
  userId,
  className = "",
}: ProfileAvatarEditorProps) {
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing,  setRemoving]  = useState(false);

  const sz  = sizeMap[size];
  const ac  = accentMap[accentColor];
  const hasImage = !!user?.imageUrl;
  const isLoading = uploading || removing;

  async function syncFirestore(imageUrl: string | null) {
    const uid = userId || user?.id;
    if (!uid) return;
    try {
      const updates = { imageUrl: imageUrl ?? "", updatedAt: serverTimestamp() };
      if (membershipId) {
        await setDoc(doc(db, "organizationMembers", membershipId), updates, { merge: true });
      }
      await setDoc(doc(db, "users", uid), updates, { merge: true });
    } catch (e) {
      console.warn("[ProfileAvatarEditor] Firestore sync failed:", e);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !user) return;

    if (!ALLOWED.includes(file.type)) { toast.error("Only JPG, PNG, or WebP images are allowed."); return; }
    if (file.size > MAX_BYTES)        { toast.error("Image must be smaller than 5 MB.");            return; }

    setUploading(true);
    const t = toast.loading("Uploading photo…");
    try {
      const compressed = await compressImage(file);
      await user.setProfileImage({ file: compressed });
      await user.reload();
      await syncFirestore(user.imageUrl);
      toast.success("Profile photo updated!", { id: t });
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.longMessage || err?.message || "Upload failed.", { id: t });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user || !hasImage) return;
    setRemoving(true);
    const t = toast.loading("Removing photo…");
    try {
      await user.setProfileImage({ file: null as any });
      await user.reload();
      await syncFirestore(null);
      toast.success("Profile photo removed.", { id: t });
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.longMessage || err?.message || "Remove failed.", { id: t });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Avatar circle */}
      <div
        className={`${sz.container} ring-4 ${ac.ring} rounded-full overflow-hidden shrink-0 bg-slate-100 relative cursor-pointer group`}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        title="Click to change photo"
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors z-10">
            <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
          </div>
        )}

        {user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt="Profile"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`w-full h-full ${ac.bg} flex items-center justify-center text-white font-black select-none ${sz.text}`}>
            {fallbackLetter.toUpperCase()}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        {/* Change / Upload Photo */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
          ) : (
            <><Camera className="w-3.5 h-3.5" /> {hasImage ? "Change Photo" : "Upload Photo"}</>
          )}
        </button>

        {/* Remove Photo — only when a photo exists */}
        {hasImage && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-500 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {removing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Removing…</>
            ) : (
              <><Trash2 className="w-3.5 h-3.5" /> Remove Photo</>
            )}
          </button>
        )}
      </div>

      <p className="text-[10px] text-slate-400">JPG, PNG or WebP · max 5 MB</p>
    </div>
  );
}
