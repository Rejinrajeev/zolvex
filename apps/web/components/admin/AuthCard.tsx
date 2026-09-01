import type { ReactNode } from "react";

/**
 * The frame shared by every admin auth screen (login, 2FA setup, 2FA
 * challenge). Sits outside the panel layout, so it carries its own chrome:
 * the Zolvex wordmark, then the screen's title.
 */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-paper p-7 shadow-[0_40px_90px_-45px_rgba(12,58,44,0.45)] ring-1 ring-ink/5 sm:p-8">
      <span className="font-anton text-xl uppercase tracking-tight text-ink">Zolvex</span>
      <h1 className="mt-4 font-sora text-2xl font-bold leading-tight tracking-tight text-ink">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1.5 font-sora text-sm leading-relaxed text-moss">{subtitle}</p>
      )}
      <div className="mt-6 border-t border-ink/8 pt-6">{children}</div>
    </div>
  );
}
