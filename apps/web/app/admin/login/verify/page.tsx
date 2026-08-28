"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Phase = "loading-setup" | "enter-setup-code" | "setup-done-enter-login-code" | "enter-login-code";

function VerifyTwoFactorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const needsSetup = searchParams.get("setup") === "1";

  const [phase, setPhase] = useState<Phase>(needsSetup ? "loading-setup" : "enter-login-code");
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSetupCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
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
    setSubmitting(true);
    try {
      const path = useRecoveryCode ? "/admin/api/auth/2fa/recovery" : "/admin/api/auth/2fa/login/verify";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.status === 200) {
        router.push("/admin/dashboard");
        return;
      }
      if (res.status === 423) {
        setError("Account locked due to too many failed attempts. Try again later.");
      } else {
        setError("That code didn't work. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "loading-setup") {
    return <p>Setting up two-factor authentication…</p>;
  }

  if (phase === "enter-setup-code" || phase === "setup-done-enter-login-code") {
    return (
      <div>
        <h1>Set up two-factor authentication</h1>
        {phase === "enter-setup-code" && otpauthUrl && (
          <>
            <p>Scan this in your authenticator app:</p>
            <code style={{ wordBreak: "break-all" }}>{otpauthUrl}</code>
            {recoveryCodes && (
              <>
                <p>Save these recovery codes somewhere safe — they will not be shown again:</p>
                <ul>
                  {recoveryCodes.map((rc) => (
                    <li key={rc}>
                      <code>{rc}</code>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <form onSubmit={handleSetupCodeSubmit}>
              <label>
                Enter the 6-digit code from your app
                <input
                  inputMode="numeric"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              {error && <p role="alert">{error}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? "Verifying…" : "Enable 2FA"}
              </button>
            </form>
          </>
        )}
        {phase === "setup-done-enter-login-code" && (
          <>
            <p>2FA is now enabled. Enter a fresh code from your app to finish signing in.</p>
            <form onSubmit={handleLoginCodeSubmit}>
              <label>
                6-digit code
                <input
                  inputMode="numeric"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              {error && <p role="alert">{error}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? "Verifying…" : "Finish signing in"}
              </button>
            </form>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1>Two-factor authentication</h1>
      <form onSubmit={handleLoginCodeSubmit}>
        <label>
          {useRecoveryCode ? "Recovery code" : "6-digit code"}
          <input required value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Verifying…" : "Verify"}
        </button>
      </form>
      <button type="button" onClick={() => setUseRecoveryCode((v) => !v)}>
        {useRecoveryCode ? "Use an authenticator code instead" : "Use a recovery code instead"}
      </button>
    </div>
  );
}

export default function VerifyTwoFactorPage() {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <VerifyTwoFactorForm />
    </Suspense>
  );
}
