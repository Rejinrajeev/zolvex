"use client";

import { useRef, useState } from "react";
import { Label, FieldError } from "./ui";
import { IconSanitize } from "@/components/icons";
import { adminFetch } from "@/lib/admin/fetch";

/**
 * A click-or-drag image dropzone that swaps to a preview once an upload
 * succeeds. Drag-over shifts the ring to green; either an upload failure
 * (this component's own `error`) or a server field error (`serverError`)
 * shows beneath it.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  required,
  serverError,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  serverError?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayError = error ?? serverError;

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await adminFetch("/admin/api/uploads", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      const messages: Record<string, string> = {
        file_too_large: "That file is too large (5MB max).",
        invalid_file_type: "Only JPEG, PNG and WebP images are allowed.",
        no_file: "No file was received.",
        upload_failed: "Upload failed. Please try again.",
      };
      setError(messages[data?.error] ?? "Upload failed. Please try again.");
      return;
    }
    onChange(data.url);
  }

  return (
    <div>
      <Label required={required}>{label}</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) uploadFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative mt-1.5 flex aspect-[4/3] max-w-xs cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-mist transition-shadow ${
          dragOver
            ? "ring-2 ring-green"
            : displayError
              ? "ring-2 ring-danger"
              : "ring-1 ring-ink/10 hover:ring-ink/25"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 font-sora text-sm font-medium text-moss">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green/15 text-green-ink">
              <IconSanitize className="h-5 w-5" />
            </span>
            {uploading ? "Uploading…" : "Click or drag an image"}
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }}
        />
      </div>
      {displayError && <FieldError>{displayError}</FieldError>}
    </div>
  );
}
