"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconClose, IconCheck, IconAlert } from "./icons";

type Status = "idle" | "submitting" | "success" | "error";

interface Place {
  id: string;
  name: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The enquiry flow: inline validation, spinner-on-submit, banner + retry on
 * failure, confirmation on success, a real Tab/Shift+Tab focus trap, focus
 * restored to whatever opened the modal, errors linked to their fields via
 * aria-describedby and announced via role="alert". Submits to the public
 * BFF route (`POST /api/enquiries`), which forwards to the Express API and
 * lands the enquiry in the admin panel.
 */
export function EnquiryModal({
  open,
  onClose,
  places,
}: {
  open: boolean;
  onClose: () => void;
  places: Place[];
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    firstFieldRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrors({});
    }
  }, [open]);

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const place = String(form.get("place") ?? "");

    const date = String(form.get("date") ?? "");

    const nextErrors: Record<string, string> = {};
    if (!name) nextErrors.name = "Enter your name.";
    if (!phone || phone.replace(/\D/g, "").length < 7) {
      nextErrors.phone = "Enter a valid phone number.";
    }
    if (!place) nextErrors.place = "Select a location.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, place, preferredDate: date || undefined }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-forest/45 backdrop-blur-[2px] sm:items-center sm:p-6"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-title"
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-cream p-7 sm:rounded-[2rem] sm:p-9"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 id="enquiry-title" className="font-anton text-3xl uppercase tracking-tight text-ink">
                Book a walkthrough
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-mist"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            {status === "success" ? (
              <div className="mt-8 flex flex-col items-start gap-4 py-6">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green text-forest">
                  <IconCheck className="h-7 w-7" />
                </span>
                <div>
                  <p className="font-anton text-2xl uppercase tracking-tight text-ink">You&apos;re on the list</p>
                  <p className="mt-2 max-w-sm font-sora text-moss">
                    Your enquiry is logged. We&apos;ll call to confirm a time that works.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 rounded-full bg-green px-6 py-3 font-sora text-sm font-semibold text-forest"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
                <Field ref={firstFieldRef} name="name" label="Your name" error={errors.name} autoComplete="name" />
                <Field name="phone" label="Phone number" type="tel" error={errors.phone} autoComplete="tel" />
                <div>
                  <label htmlFor="place" className="block font-sora text-sm font-semibold text-ink">
                    Location
                  </label>
                  <select
                    id="place"
                    name="place"
                    defaultValue=""
                    aria-invalid={Boolean(errors.place)}
                    aria-describedby={errors.place ? "place-error" : undefined}
                    className={`mt-1.5 h-12 w-full appearance-none rounded-xl bg-paper bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23066b44%22%20stroke-width=%221.5%22%3E%3Cpath%20d=%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat px-4 font-sora text-ink outline-none ring-1 focus:ring-2 focus:ring-green ${
                      errors.place ? "ring-2 ring-danger" : "ring-ink/15"
                    }`}
                  >
                    <option value="" disabled>
                      {places.length === 0 ? "No locations available yet" : "Select a location"}
                    </option>
                    {places.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.place && <ErrorText id="place-error">{errors.place}</ErrorText>}
                </div>
                <div>
                  <label htmlFor="date" className="block font-sora text-sm font-semibold text-ink">
                    Preferred date <span className="font-normal text-moss">(optional)</span>
                  </label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    className="mt-1.5 h-12 w-full rounded-xl bg-paper px-4 font-sora text-ink outline-none ring-1 ring-ink/15 focus:ring-2 focus:ring-green"
                  />
                </div>

                {status === "error" && (
                  <div
                    role="alert"
                    className="flex items-center justify-between gap-3 rounded-xl bg-danger-soft px-4 py-3 font-sora text-sm font-medium text-danger ring-1 ring-danger/30"
                  >
                    Something went wrong sending your enquiry.
                    <button type="submit" className="shrink-0 font-semibold underline underline-offset-2">
                      Retry
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-green px-6 py-4 font-sora font-semibold text-forest transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {status === "submitting" ? (
                    <>
                      <span
                        aria-hidden
                        className="h-4 w-4 animate-spin rounded-full border-2 border-forest/30 border-t-forest"
                      />
                      Sending…
                    </>
                  ) : (
                    "Send enquiry"
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ErrorText({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 font-sora text-sm font-semibold text-danger">
      <IconAlert aria-hidden className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

function Field({
  name,
  label,
  type = "text",
  error,
  autoComplete,
  ref,
}: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  autoComplete?: string;
  ref?: React.Ref<HTMLInputElement>;
}) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className="block font-sora text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1.5 h-12 w-full rounded-xl bg-paper px-4 font-sora text-ink placeholder:text-moss outline-none ring-1 focus:ring-2 focus:ring-green ${
          error ? "ring-2 ring-danger" : "ring-ink/15"
        }`}
      />
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </div>
  );
}
