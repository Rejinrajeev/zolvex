import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { IconAlert } from "@/components/icons";

/* ============================================================
   Shared admin primitives — "Fresh Start" in an Operate register.
   One control vocabulary across every admin screen.
   ============================================================ */

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-sora font-semibold transition-[transform,background-color,color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2";

const BTN_VARIANT = {
  primary:
    "bg-green text-forest shadow-[0_8px_18px_-10px_rgba(15,184,119,0.5)] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-10px_rgba(15,184,119,0.55)] active:translate-y-0",
  ghost: "border border-ink/15 bg-paper text-ink hover:border-green hover:bg-mist hover:text-green-ink",
  danger:
    "border border-danger/40 bg-danger-soft text-danger hover:border-danger hover:bg-danger hover:text-cream",
  quiet: "text-green-ink hover:text-forest underline underline-offset-4 decoration-green/40",
} as const;

const BTN_SIZE = {
  sm: "px-3.5 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

type ButtonVariant = keyof typeof BTN_VARIANT;
type ButtonSize = keyof typeof BTN_SIZE;

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent opacity-60"
        />
      )}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  children,
  className = "",
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-sora text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl font-sora text-sm leading-relaxed text-moss">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ---- Fields ---- */

const FIELD_BASE =
  "block w-full rounded-xl bg-paper px-3.5 font-sora text-ink placeholder:text-moss/70 outline-none ring-1 transition-shadow focus:ring-2 focus:ring-green";

function ringFor(error?: string) {
  return error ? "ring-2 ring-danger" : "ring-ink/15";
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 flex items-center gap-1.5 font-sora text-sm font-semibold text-danger"
    >
      <IconAlert aria-hidden className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}

export function FieldHelp({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 font-sora text-xs leading-relaxed text-moss">
      {children}
    </p>
  );
}

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block font-sora text-sm font-semibold text-ink">
      {children}
      {required && <span className="text-green-ink"> *</span>}
    </label>
  );
}

export function TextField({
  id,
  label,
  error,
  help,
  required,
  className = "",
  wrapperClassName = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  help?: ReactNode;
  wrapperClassName?: string;
}) {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div className={wrapperClassName}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? helpId}
        className={`mt-1.5 h-11 ${FIELD_BASE} ${ringFor(error)} ${className}`}
      />
      {error ? <FieldError id={errorId}>{error}</FieldError> : help ? <FieldHelp id={helpId}>{help}</FieldHelp> : null}
    </div>
  );
}

export function TextAreaField({
  id,
  label,
  error,
  help,
  required,
  className = "",
  rows = 4,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  error?: string;
  help?: ReactNode;
}) {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <textarea
        {...props}
        id={id}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? helpId}
        className={`mt-1.5 py-3 ${FIELD_BASE} ${ringFor(error)} ${className}`}
      />
      {error ? <FieldError id={errorId}>{error}</FieldError> : help ? <FieldHelp id={helpId}>{help}</FieldHelp> : null}
    </div>
  );
}

export function SelectField({
  id,
  label,
  error,
  help,
  required,
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  error?: string;
  help?: ReactNode;
}) {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      <select
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? helpId}
        className={`mt-1.5 h-11 appearance-none bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23066b44%22%20stroke-width=%221.6%22%3E%3Cpath%20d=%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[length:1.1rem] bg-[right_0.9rem_center] bg-no-repeat pr-10 ${FIELD_BASE} ${ringFor(error)} ${className}`}
      >
        {children}
      </select>
      {error ? <FieldError id={errorId}>{error}</FieldError> : help ? <FieldHelp id={helpId}>{help}</FieldHelp> : null}
    </div>
  );
}

export function CheckboxField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 font-sora text-sm text-ink">
      <span
        className={`relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-green" : "bg-ink/15"
        }`}
      >
        <span
          className={`absolute h-5 w-5 rounded-full bg-paper shadow-sm transition-transform ${
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
          }`}
        />
      </span>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {label}
    </label>
  );
}

/* ---- Panels & feedback ---- */

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-paper p-5 shadow-[0_18px_44px_-28px_rgba(12,58,44,0.28)] ring-1 ring-ink/5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error";
  children: ReactNode;
}) {
  const styles = {
    info: "bg-mist text-ink ring-1 ring-green/20",
    success: "bg-green/12 text-forest ring-1 ring-green/30",
    error: "bg-danger-soft text-danger ring-1 ring-danger/30",
  }[tone];
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 font-sora text-sm font-medium ${styles}`}
    >
      {tone === "error" && <IconAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-mist px-6 py-14 text-center">
      <p className="font-sora text-base font-semibold text-ink">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-sm font-sora text-sm text-moss">{children}</p>}
    </div>
  );
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" />
      ))}
    </div>
  );
}
