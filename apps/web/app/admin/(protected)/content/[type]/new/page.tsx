"use client";

import { useParams, useRouter } from "next/navigation";
import { configFor } from "@/lib/admin-content/configs";
import { ContentForm, type FormValues } from "@/components/admin/ContentForm";
import { ErrorBanner } from "@/components/admin/ErrorBanner";
import { PageHeader } from "@/components/admin/ui";
import { adminFetch } from "@/lib/admin/fetch";

interface ZodIssue {
  path: (string | number)[];
  message: string;
}

export default function NewContentPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = params.type;
  const config = configFor(type);

  if (!config) {
    return <ErrorBanner message={`Unknown content type "${type}".`} />;
  }

  async function handleSubmit(values: Partial<FormValues>) {
    const res = await adminFetch(`/admin/api/content/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/admin/content/${type}`);
      return;
    }
    if (data?.error === "invalid_request") {
      const fieldErrors: Record<string, string> = {};
      for (const issue of (data.issues ?? []) as ZodIssue[]) {
        if (typeof issue.path[0] === "string") fieldErrors[issue.path[0]] = issue.message;
      }
      return { fieldErrors };
    }
    if (data?.error === "slug_conflict") {
      return { generalError: data.message ?? "That slug is already in use." };
    }
    return { generalError: "Could not save. Please try again." };
  }

  return (
    <div>
      <PageHeader title={`New ${config.displayName.toLowerCase()}`} />
      <ContentForm config={config} onSubmit={handleSubmit} submitLabel="Create" />
    </div>
  );
}
