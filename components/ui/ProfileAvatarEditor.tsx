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
  sm:  { container: "w-12 h-12", text: "text-lg",  ring: "ring-2", cam: "w-5 h-5 -bottom-1 -right-1", camIcon: "w-2.5 h-2.5" },
  md:  { container: "w-16 h-16", text: "text-2xl", ring: "ring-2", cam: "w-6 h-6 -bottom-1 -right-1", camIcon: "w-3 h-3"   },
  lg:  { container: "w-20 h-20", text: "text-3xl", ring: "ring-4", cam: "w-7 h-7 -bottom-1.5 -right-1.5", camIcon: "w-3.5 h-3.5" },
  xl:  { container: "w-24 h-24", text: "text-4xl", ring: "ring-4", cam: "w-8 h-8 -bottom-2 -right-2",   camIcon: "w-4 h-4"   },
};

const accentMap = {
  sky:     { bg: "bg-sky-600",     ring: "ring-sky-200",     cam: "bg-sky-600 hover:bg-sky-700"     },
  emerald: { bg: "bg-emerald-600", ring: "ring-emerald-200", cam: "bg-emerald-600 hover:bg-emerald-700" },
  violet:  { bg: "bg-violet-600",  ring: "ring-violet-200",  cam: "bg-violet-600 hover:bg-violet-700"  },
  indigo:  { bg: "bg-indigo-600",  ring: "ring-indigo-200",  cam: "bg-indigo-600 hover:bg-indigo-700"  },
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
  const [removing, setRemoving] = useState(false);

  const sz = sizeMap[size];
  const ac = accentMap[accentColor];
  const hasImage = !!user?.imageUrl;
  const isLoading = uploading || removing;

  async function syncImageUrlToFirestore(imageUrl: string | null) {
    const uid = userId || user?.id;
    if (!uid) return;
    try {
      const updates = { imageUrl: imageUrl || "", updatedAt: serverTimestamp() };
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

    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setUploading(true);
    const t = toast.loading("Uploading photo…");
    try {
      const compressed = await compressImage(file);
      await user.setProfileImage({ file: compressed });
      await user.reload();
      await syncImageUrlToFirestore(user.imageUrl);
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
      await syncImageUrlToFirestore(null);
      toast.success("Profile photo removed.", { id: t });
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.longMessage || err?.message || "Remove failed.", { id: t });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Avatar circle */}
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className={`${sz.container} ${sz.ring} ${ac.ring} rounded-full overflow-hidden shrink-0 bg-slate-100 relative`}>
          {isLoading ? (
            <div className={`${sz.container} flex items-center justify-center bg-black/30`}>
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          ) : user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="Profile"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`${sz.container} ${ac.bg} flex items-center justify-center text-white font-black select-none ${sz.text}`}>
              {fallbackLetter.toUpperCase()}
            </div>
          )}
        </div>

        {/* Camera button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          title="Upload photo (JPG, PNG, WebP · max 5 MB)"
          aria-label="Change profile photo"
          className={`absolute ${sz.cam} ${ac.cam} disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-md ring-2 ring-white transition-colors`}
        >
          <Camera className={sz.camIcon} />
        </button>
      </div>

      {/* Remove button — only shown if user has a photo */}
      {hasImage && !isLoading && (
        <button
          type="button"
          onClick={handleRemove}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
          aria-label="Remove profile photo"
        >
          <Trash2 className="w-3 h-3" /> Remove photo
        </button>
      )}
    </div>
  );
}
