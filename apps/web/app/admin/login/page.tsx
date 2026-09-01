"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/admin/AuthCard";
import { Button, TextField, Notice } from "@/components/admin/ui";
import { isEmail, isFilled } from "@/lib/admin/validate";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState<"expired" | "passwordchanged" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("passwordchanged") === "1") setBanner("passwordchanged");
    else if (params.get("expired") === "1") setBanner("expired");
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const nextErrors: { email?: string; password?: string } = {};
    if (!isFilled(email)) nextErrors.email = "Enter your email.";
    else if (!isEmail(email)) nextErrors.email = "Enter a valid email address.";
    if (!isFilled(password)) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/admin/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.status === 200) {
        router.push(`/admin/login/verify?setup=${data.twoFAEnabled ? "0" : "1"}`);
        return;
      }
      if (res.status === 423) {
        setFormError(
          `Account locked. Try again after ${new Date(data.lockedUntil).toLocaleTimeString()}.`
        );
      } else {
        setFormError("That email and password don't match.");
      }
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="Sign in" subtitle="Staff access only. Every sign-in is written to the audit log.">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {banner && !formError && (
          <Notice tone={banner === "passwordchanged" ? "success" : "info"}>
            {banner === "passwordchanged"
              ? "Password changed. Sign in with your new password."
              : "Your session expired. Please sign in again."}
          </Notice>
        )}
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((p) => ({ ...p, email: undefined }));
          }}
          error={errors.email}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((p) => ({ ...p, password: undefined }));
          }}
          error={errors.password}
        />
        {formError && <Notice tone="error">{formError}</Notice>}
        <Button type="submit" loading={submitting} size="lg" className="mt-1 w-full">
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
