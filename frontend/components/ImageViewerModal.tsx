"use client";

import { X } from "lucide-react";

interface ImageViewerModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImageViewerModal({ imageUrl, onClose }: ImageViewerModalProps) {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/90 p-2 shadow-lg"
      >
        <X className="h-6 w-6 text-slate-800" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Angle capture"
        className="max-h-full max-w-full rounded-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
