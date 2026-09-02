"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { AuthCard } from "@/components/admin/AuthCard";
import { Button, Notice } from "@/components/admin/ui";
import { IconAlert } from "@/components/icons";

type Phase = "loading-setup" | "enter-setup-code" | "setup-done-enter-login-code" | "enter-login-code";

const microLabel = "font-sora text-xs font-semibold uppercase tracking-[0.14em] text-moss";

function CodeField({
  label,
  value,
  onChange,
  numeric = true,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sora text-sm font-semibold text-ink">{label}</span>
      <input
        {...(numeric ? ({ inputMode: "numeric", maxLength: 6 } as const) : {})}
        autoComplete="one-time-code"
        required
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`block h-12 w-full rounded-xl bg-paper px-3.5 text-center font-mono text-lg tracking-[0.3em] text-ink outline-none ring-1 focus:ring-2 focus:ring-green ${
          error ? "ring-2 ring-danger" : "ring-ink/15"
        }`}
      />
      {error && (
        <p role="alert" className="mt-1.5 flex items-center gap-1.5 font-sora text-sm font-semibold text-danger">
          <IconAlert aria-hidden className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </label>
  );
}

function VerifyTwoFactorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const needsSetup = searchParams.get("setup") === "1";

  const [phase, setPhase] = useState<Phase>(needsSetup ? "loading-setup" : "enter-login-code");
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [copied, setCopied] = useState<"key" | "codes" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const secret = useMemo(() => {
    if (!otpauthUrl) return null;
    try {
      return new URL(otpauthUrl).searchParams.get("secret");
    } catch {
      return null;
    }
  }, [otpauthUrl]);

  useEffect(() => {
    if (!needsSetup) return;
    (async () => {
      const res = await fetch("/admin/api/auth/2fa/setup", { method: "POST" });
      if (res.status !== 200) {
        setError("Could not start 2FA setup. Please log in again.");
        return;
      }
      const data = await res.json();
      setOtpauthUrl(data.otpauthUrl);
      setRecoveryCodes(data.recoveryCodes);
      setPhase("enter-setup-code");
    })();
  }, [needsSetup]);

  useEffect(() => {
    if (!otpauthUrl) return;
    let cancelled = false;
    QRCode.toDataURL(otpauthUrl, {
      margin: 1,
      width: 320,
      color: { dark: "#0c3a2cff", light: "#ffffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [otpauthUrl]);

  async function copy(text: string, which: "key" | "codes") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied((current) => (current === which ? null : current)), 2000);
    } catch {
      // Clipboard blocked — the value is on screen to copy by hand.
    }
  }

  function validateCode(): boolean {
    setFieldError(null);
    const trimmed = code.trim();
    if (!trimmed) {
      setFieldError(useRecoveryCode ? "Enter a recovery code." : "Enter the 6-digit code.");
      return false;
    }
    if (!useRecoveryCode && !/^\d{6}$/.test(trimmed)) {
      setFieldError("The code is 6 digits.");
      return false;
    }
    return true;
  }

  async function handleSetupCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validateCode()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/admin/api/auth/2fa/setup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.status === 200) {
        setCode("");
        setPhase("setup-done-enter-login-code");
      } else {
        setError("That code didn't match. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoginCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validateCode()) return;
    setSubmitting(true);
    try {
      const path = useRecoveryCode
        ? "/admin/api/auth/2fa/recovery"
        : "/admin/api/auth/2fa/login/verify";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.status === 200) {
        const data = await res.json().catch(() => null);
        router.push(data?.mustChangePassword ? "/admin/account?first=1" : "/admin/dashboard");
        return;
      }
      if (res.status === 423) {
        setError("Account locked after too many failed attempts. Try again later.");
      } else {
        setError("That code didn't work. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "loading-setup") {
    return (
      <AuthCard title="Set up two-factor authentication">
        <p className="font-sora text-sm text-moss">Generating your setup key…</p>
        {error && (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
      </AuthCard>
    );
  }

  if (phase === "enter-setup-code") {
    return (
      <AuthCard
        title="Set up two-factor authentication"
        subtitle="Scan the code with an authenticator app — Google Authenticator, 1Password, Authy, or similar."
      >
        <div className="flex flex-col gap-6">
          {qrDataUrl && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, no loader */}
              <img
                src={qrDataUrl}
                alt="QR code to add this account to your authenticator app"
                className="h-44 w-44 rounded-xl bg-paper p-2 ring-1 ring-ink/10"
              />
            </div>
          )}

          {secret && (
            <div>
              <p className={microLabel}>Can&apos;t scan? Enter this key</p>
              <div className="mt-1.5 flex items-center gap-3 rounded-xl bg-mist px-3.5 py-2.5">
                <code className="flex-1 break-all font-mono text-sm text-ink">
                  {secret.replace(/(.{4})/g, "$1 ").trim()}
                </code>
                <button
                  type="button"
                  onClick={() => copy(secret, "key")}
                  className="shrink-0 font-sora text-xs font-semibold text-green-ink underline underline-offset-2 hover:text-forest"
                >
                  {copied === "key" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {recoveryCodes && recoveryCodes.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <p className={microLabel}>Recovery codes</p>
                <button
                  type="button"
                  onClick={() => copy(recoveryCodes.join("\n"), "codes")}
                  className="font-sora text-xs font-semibold text-green-ink underline underline-offset-2 hover:text-forest"
                >
                  {copied === "codes" ? "Copied" : "Copy all"}
                </button>
              </div>
              <p className="mt-1 font-sora text-xs leading-relaxed text-moss">
                Save these now. They&apos;re shown once and each one signs you in if you lose your
                device.
              </p>
              <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl bg-mist p-3.5 font-mono text-sm text-ink">
                {recoveryCodes.map((rc) => (
                  <li key={rc}>{rc}</li>
                ))}
              </ul>
            </div>
          )}

          <form
            onSubmit={handleSetupCodeSubmit}
            className="flex flex-col gap-4 border-t border-ink/8 pt-6"
          >
            <CodeField
              label="Enter the 6-digit code from your app"
              value={code}
              onChange={setCode}
              error={fieldError ?? undefined}
            />
            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" loading={submitting} size="lg" className="w-full">
              {submitting ? "Verifying…" : "Enable 2FA"}
            </Button>
          </form>
        </div>
      </AuthCard>
    );
  }

  if (phase === "setup-done-enter-login-code") {
    return (
      <AuthCard title="Two-factor authentication is on">
        <div className="flex flex-col gap-4">
          <p className="font-sora text-sm text-moss">
            Enter a fresh 6-digit code from your app to finish signing in.
          </p>
          <form onSubmit={handleLoginCodeSubmit} className="flex flex-col gap-4">
            <CodeField
              label="6-digit code"
              value={code}
              onChange={setCode}
              error={fieldError ?? undefined}
            />
            {error && <Notice tone="error">{error}</Notice>}
            <Button type="submit" loading={submitting} size="lg" className="w-full">
              {submitting ? "Verifying…" : "Finish signing in"}
            </Button>
          </form>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Two-factor authentication"
      subtitle={
        useRecoveryCode
          ? "Enter one of the recovery codes you saved during setup."
          : "Enter the current code from your authenticator app."
      }
    >
      <div className="flex flex-col gap-4">
        <form onSubmit={handleLoginCodeSubmit} className="flex flex-col gap-4">
          <CodeField
            label={useRecoveryCode ? "Recovery code" : "6-digit code"}
            value={code}
            onChange={setCode}
            numeric={!useRecoveryCode}
            error={fieldError ?? undefined}
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" loading={submitting} size="lg" className="w-full">
            {submitting ? "Verifying…" : "Verify"}
          </Button>
        </form>
        <button
          type="button"
          onClick={() => {
            setUseRecoveryCode((v) => !v);
            setCode("");
            setError(null);
            setFieldError(null);
          }}
          className="self-start font-sora text-sm font-semibold text-green-ink underline underline-offset-2 hover:text-forest"
        >
          {useRecoveryCode ? "Use an authenticator code instead" : "Use a recovery code instead"}
        </button>
      </div>
    </AuthCard>
  );
}

export default function VerifyTwoFactorPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Two-factor authentication">
          <p className="font-sora text-sm text-moss">Loading…</p>
        </AuthCard>
      }
    >
      <VerifyTwoFactorForm />
    </Suspense>
  );
}
