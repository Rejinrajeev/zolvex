import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as authController from "../../controllers/admin/auth.controller.js";

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Slightly more generous than loginRateLimit since these routes are hit as part of
// a normal multi-step 2FA/refresh flow, but still bounded to prevent distributed
// guessing across accounts and raw request-volume exhaustion. Each route below gets
// its own independent limiter instance (rather than one shared instance) so heavy
// traffic on one endpoint can't starve an unrelated endpoint's quota.
function authFlowRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export const adminAuthRouter = Router();

adminAuthRouter.post("/login", loginRateLimit, authController.login);
adminAuthRouter.post("/2fa/setup", authFlowRateLimit(), authController.setupTwoFA);
adminAuthRouter.post("/2fa/setup/verify", authFlowRateLimit(), authController.verifyTwoFASetup);
adminAuthRouter.post("/2fa/login/verify", authFlowRateLimit(), authController.verifyTwoFALogin);
adminAuthRouter.post("/2fa/recovery", authFlowRateLimit(), authController.loginWithRecoveryCode);
adminAuthRouter.post("/refresh", authFlowRateLimit(), authController.refresh);
adminAuthRouter.post("/logout", authFlowRateLimit(), authController.logout);
