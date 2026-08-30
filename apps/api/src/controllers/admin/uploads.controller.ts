import type { Response } from "express";
import { uploadBuffer } from "../../lib/uploads/cloudinary.js";
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
    console.error(error);
    res.status(502).json({ error: "upload_failed" });
  }
}
