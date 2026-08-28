import { Router, type Request, type Response, type NextFunction } from "express";
import multer, { MulterError } from "multer";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as uploadsController from "../../controllers/admin/uploads.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const adminUploadsRouter = Router();

// multer parses and validates the multipart body before the controller ever
// runs, so its rejections surface here rather than at the controller's own
// checks -- an oversized file (`limits.fileSize`), a file sent under the wrong
// form-field name (`LIMIT_UNEXPECTED_FILE`), too many parts, and so on.
//
// EVERY MulterError is a malformed request from the client, so the whole class
// maps to 400; only the ones falling outside multer (a genuine server fault)
// are handed to app.ts's catch-all 500. Previously only LIMIT_FILE_SIZE was
// special-cased and every other multer code became an opaque, unhelpful 500.
function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      // Keep the specific code the existing API contract already exposes for
      // the oversized case; everything else gets one generic code.
      const error = err.code === "LIMIT_FILE_SIZE" ? "file_too_large" : "invalid_upload";
      res.status(400).json({ error });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
}

adminUploadsRouter.post("/", requireAuth, handleUpload, uploadsController.upload);
