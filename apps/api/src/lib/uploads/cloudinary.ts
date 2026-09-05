import { v2 as cloudinary } from "cloudinary";

/** The three CLOUDINARY_* env vars are missing on this deployment. */
export class CloudinaryNotConfiguredError extends Error {}

/** Cloudinary rejected our credentials -- they are set, but wrong. */
export class CloudinaryAuthError extends Error {}

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new CloudinaryNotConfiguredError(
      "Cloudinary env vars (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) are not set"
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
  configured = true;
}

/**
 * Cloudinary reports bad credentials as an auth failure rather than a
 * transport error. Recognising it lets the caller tell "the deployment has
 * no credentials" apart from "the credentials it has are wrong" -- the two
 * cases have completely different fixes -- without passing raw SDK error
 * text back to the client.
 */
function isAuthFailure(error: unknown): boolean {
  const status = (error as { http_code?: number })?.http_code;
  if (status === 401 || status === 403) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /api[_ ]?key|signature|unauthor|authenticat/i.test(message);
}

/** Uploads an in-memory file buffer to Cloudinary, returns its public URL. */
export function uploadBuffer(buffer: Buffer, folder: string): Promise<{ url: string }> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) {
        const cause = error ?? new Error("Cloudinary upload returned no result");
        reject(isAuthFailure(cause) ? new CloudinaryAuthError("Cloudinary rejected the credentials") : cause);
        return;
      }
      resolve({ url: result.secure_url });
    });
    stream.end(buffer);
  });
}
