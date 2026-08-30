"use client";

import type { ReactNode } from "react";

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className="w-full max-w-md border-t-2 border-ink bg-paper p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-modal-title" className="mb-4 font-display text-2xl text-ink">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
