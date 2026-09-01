"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, Panel, Button, TextField, Notice } from "@/components/admin/ui";
import { isFilled } from "@/lib/admin/validate";
import { adminFetch } from "@/lib/admin/fetch";

const MIN_LENGTH = 12;

function ChangePasswordForm() {
  const searchParams = useSearchParams();
  const first = searchParams.get("first") === "1";

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const nextErrors: typeof errors = {};
    if (!isFilled(current)) nextErrors.current = "Enter your current password.";
    if (!isFilled(next)) nextErrors.next = "Enter a new password.";
    else if (next.length < MIN_LENGTH) nextErrors.next = `Use at least ${MIN_LENGTH} characters.`;
    else if (next === current) nextErrors.next = "Choose a password different from your current one.";
    if (confirm !== next) nextErrors.confirm = "The two passwords don't match.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await adminFetch("/admin/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        // Every session was revoked server-side — sign back in with the new one.
        window.location.href = "/admin/login?passwordchanged=1";
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.status === 422 && data?.error === "wrong_current_password") {
        setErrors((p) => ({ ...p, current: "That's not your current password." }));
      } else if (res.status === 422) {
        setErrors((p) => ({ ...p, next: data?.message ?? "That password isn't allowed." }));
      } else {
        setFormError("Could not change your password. Please try again.");
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md">
      <PageHeader
        title="Your account"
        description="Change the password you use to sign in to the admin panel."
      />

      {first && (
        <div className="mb-6">
          <Notice tone="info">
            Welcome. You&apos;re signed in with a one-time password — set one you&apos;ll remember to
            finish.
          </Notice>
        </div>
      )}

      <Panel>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <h2 className="font-sora text-base font-semibold text-ink">Change password</h2>
          {formError && <Notice tone="error">{formError}</Notice>}
          <TextField
            id="current-password"
            label={first ? "One-time password" : "Current password"}
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value);
              setErrors((p) => ({ ...p, current: undefined }));
            }}
            error={errors.current}
          />
          <TextField
            id="new-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => {
              setNext(e.target.value);
              setErrors((p) => ({ ...p, next: undefined }));
            }}
            error={errors.next}
            help={`At least ${MIN_LENGTH} characters.`}
          />
          <TextField
            id="confirm-password"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setErrors((p) => ({ ...p, confirm: undefined }));
            }}
            error={errors.confirm}
          />
          <Button type="submit" loading={submitting} size="lg" className="mt-1">
            {submitting ? "Saving…" : "Change password"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <ChangePasswordForm />
    </Suspense>
  );
}
