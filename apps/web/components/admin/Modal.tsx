"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { IconClose } from "@/components/icons";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-forest/45 px-4 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className="modal-panel w-full max-w-md rounded-t-2xl bg-cream p-6 shadow-[0_40px_90px_-40px_rgba(12,58,44,0.55)] sm:rounded-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="admin-modal-title" className="font-sora text-xl font-bold tracking-tight text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-mist"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
