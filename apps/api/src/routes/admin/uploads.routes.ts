import { Router, type Request, type Response, type NextFunction } from "express";
import multer, { MulterError } from "multer";
import { requireAuth } from "../../lib/auth/middleware.js";
import * as uploadsController from "../../controllers/admin/uploads.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const adminUploadsRouter = Router();

// multer enforces its own `limits.fileSize` before the request body is ever
// fully parsed, so an oversized file throws a MulterError here rather than
// reaching the controller's own size check. Without this wrapper, that error
// would fall through to app.ts's catch-all handler as an opaque 500 --
// normalize it to the same 400 the controller uses for every other rejection.
function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "file_too_large" });
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
