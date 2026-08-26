import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../../controllers/admin/auth.controller.js";

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const adminAuthRouter = Router();

adminAuthRouter.post("/login", loginRateLimit, authController.login);
adminAuthRouter.post("/2fa/setup", authController.setupTwoFA);
adminAuthRouter.post("/2fa/setup/verify", authController.verifyTwoFASetup);
adminAuthRouter.post("/2fa/login/verify", authController.verifyTwoFALogin);
adminAuthRouter.post("/2fa/recovery", authController.loginWithRecoveryCode);
adminAuthRouter.post("/refresh", authController.refresh);
adminAuthRouter.post("/logout", authController.logout);
