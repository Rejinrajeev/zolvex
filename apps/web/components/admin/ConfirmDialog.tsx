"use client";

import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button, Notice } from "./ui";

/**
 * The admin panel's answer to `window.confirm` — a real dialog in the site's
 * own voice, with the consequence spelled out and the destructive choice
 * styled as such. Like every admin modal it dismisses only through Cancel or
 * the close icon, so a stray click can't answer a delete prompt for you.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <p className="font-sora text-sm leading-relaxed text-moss">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant={tone} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
