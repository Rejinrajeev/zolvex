"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { IconClose } from "@/components/icons";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A deliberate dialog: it closes only through the close icon or one of its
 * own buttons. Clicking the backdrop and pressing Escape do nothing, so a
 * stray click never throws away a half-filled form or an in-flight decision.
 * Tab is trapped inside the panel and focus returns to the opener on close.
 */
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusable?.[0]?.focus();
    return () => {
      document.body.style.overflow = "";
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || !panelRef.current) return;
    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-forest/45 px-4 backdrop-blur-[2px] sm:items-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onKeyDown={handleKeyDown}
        className="modal-panel w-full max-w-md rounded-t-2xl bg-cream p-6 shadow-[0_40px_90px_-40px_rgba(12,58,44,0.55)] sm:rounded-2xl sm:p-7"
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
