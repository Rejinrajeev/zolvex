"use client";

import { useRef, useState } from "react";

/**
 * Extends PlaceholderPhoto's empty-frame-with-corner-marks treatment
 * (components/PlaceholderPhoto.tsx) as an interactive dropzone: drag-over
 * shifts the border to Olive Ink (matching DESIGN.md's input focus
 * language), and a successful upload swaps the frame for the real image.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/admin/api/uploads", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      const messages: Record<string, string> = {
        file_too_large: "That file is too large (5MB max).",
        invalid_file_type: "Only JPEG, PNG, and WebP images are allowed.",
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
      <label className="mb-1 block font-body text-sm text-ink">
        {label}
        {required && " *"}
      </label>
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
        className={`relative flex aspect-[4/3] max-w-xs cursor-pointer items-center justify-center overflow-hidden border bg-paper-dim ${
          dragOver ? "border-2 border-olive-ink" : "border-ink/12"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="font-stamp text-[0.7rem] uppercase tracking-wide text-slate">
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
      {error && <p role="alert" className="mt-1 font-body text-sm text-ink">{error}</p>}
    </div>
  );
}
