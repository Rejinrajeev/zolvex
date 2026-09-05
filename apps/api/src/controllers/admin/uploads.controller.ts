import type { Response } from "express";
import {
  uploadBuffer,
  CloudinaryAuthError,
  CloudinaryNotConfiguredError,
} from "../../lib/uploads/cloudinary.js";
import type { AuthedRequest } from "../../lib/auth/middleware.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export async function upload(req: AuthedRequest & { file?: Express.Multer.File }, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "no_file" });
    return;
  }
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    res.status(400).json({ error: "invalid_file_type" });
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    res.status(400).json({ error: "file_too_large" });
    return;
  }
  try {
    const result = await uploadBuffer(file.buffer, "zolvex-admin");
    res.status(200).json(result);
  } catch (error) {
    // The full error goes to the server log only. The response carries a
    // fixed code, never raw error text -- an internal message can carry
    // hostnames, paths or request detail the client has no business seeing.
    // The codes still separate the two failures an operator must tell apart:
    // credentials absent from the deployment vs. credentials that are wrong.
    console.error(error);
    if (error instanceof CloudinaryNotConfiguredError) {
      res.status(502).json({ error: "cloudinary_not_configured" });
      return;
    }
    if (error instanceof CloudinaryAuthError) {
      res.status(502).json({ error: "cloudinary_auth_failed" });
      return;
    }
    res.status(502).json({ error: "upload_failed" });
  }
}
