"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { IconClose, IconCheck } from "./icons";

type Status = "idle" | "submitting" | "success" | "error";

const PLACES = ["Downtown", "North Side", "Business District", "Industrial Park", "Other"];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * UI-complete enquiry flow per the /plan-design-review state spec (inline
 * validation, spinner-on-submit, banner+retry on failure, confirmation on
 * success), hardened per /impeccable's finish review: a real Tab/Shift+Tab
 * focus trap, focus restored to whatever opened the modal on close, errors
 * connected to their fields via aria-describedby and announced via
 * role="alert". The actual submit is a stub — the Foundation API this posts
 * to lives on a separate branch not yet merged here — wire the real
 * endpoint in when the two branches come together.
 */
export function EnquiryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      if (openerRef.current instanceof HTMLElement) {
        openerRef.current.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

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
      // Stub: simulated network round trip. Real integration posts to the
      // Foundation API's /api/enquiries endpoint once branches merge.
      await new Promise((resolve) => setTimeout(resolve, 900));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/70 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-title"
        onKeyDown={handleKeyDown}
        className="relative max-h-[92svh] w-full max-w-lg overflow-y-auto border-t-2 border-gold bg-paper p-7 sm:border-2 sm:p-9"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="enquiry-title" className="font-display text-2xl font-semibold text-ink">
            Book a visit
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-ink transition-colors hover:text-olive-ink"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {status === "success" ? (
          <div className="mt-8 flex flex-col items-start gap-4 py-6">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-olive/15 text-olive-ink">
              <IconCheck className="h-7 w-7" />
            </span>
            <div>
              <p className="font-display text-xl font-semibold text-ink">Logged.</p>
              <p className="mt-2 max-w-sm font-body text-slate">
                Your enquiry is on the record. We’ll call you to confirm
                your schedule.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 flex min-h-11 items-center font-body text-sm font-medium text-olive-ink underline underline-offset-4"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
            <Field
              ref={firstFieldRef}
              name="name"
              label="Your name"
              error={errors.name}
              autoComplete="name"
            />
            <Field
              name="phone"
              label="Phone number"
              type="tel"
              error={errors.phone}
              autoComplete="tel"
            />
            <div>
              <label htmlFor="place" className="block font-body text-sm font-medium text-ink">
                Location
              </label>
              <select
                id="place"
                name="place"
                defaultValue=""
                aria-invalid={Boolean(errors.place)}
                aria-describedby={errors.place ? "place-error" : undefined}
                className="mt-1.5 h-11 w-full appearance-none border border-ink/20 bg-paper bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23616054%22%20stroke-width=%221.5%22%3E%3Cpath%20d=%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat px-3.5 font-body text-ink focus:border-olive-ink"
              >
                <option value="" disabled>
                  Select a location
                </option>
                {PLACES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {errors.place && (
                <p id="place-error" role="alert" className="mt-1.5 font-body text-sm text-ink">
                  {errors.place}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="date" className="block font-body text-sm font-medium text-ink">
                Preferred date <span className="font-normal text-slate">(optional)</span>
              </label>
              <input
                id="date"
                name="date"
                type="date"
                className="mt-1.5 h-11 w-full border border-ink/20 bg-paper px-3.5 font-body text-ink focus:border-olive-ink"
              />
            </div>

            {status === "error" && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 border-2 border-ink bg-paper-dim px-4 py-3 font-body text-sm text-ink"
              >
                Something went wrong sending your enquiry.
                <button type="submit" className="font-medium underline underline-offset-2">
                  Retry
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="flex min-h-12 w-full items-center justify-center gap-2 bg-gold px-6 py-3.5 font-display font-semibold text-ink transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "submitting" ? (
                <>
                  <span
                    aria-hidden
                    className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink"
                  />
                  Sending…
                </>
              ) : (
                "Submit Enquiry"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
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
      <label htmlFor={name} className="block font-body text-sm font-medium text-ink">
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
        className="mt-1.5 h-11 w-full border border-ink/20 bg-paper px-3.5 font-body text-ink placeholder:text-slate focus:border-olive-ink"
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 font-body text-sm text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
