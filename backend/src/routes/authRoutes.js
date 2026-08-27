const express = require("express");
const {
  login,
  verifyLoginTotp,
  startRegistration,
  verifyRegistrationCode,
  register,
  me,
  requestPasswordReset,
  resetPassword,
  requestOtp,
  verifyOtp,
  checkAliasAvailability,
  resetPasswordWithCode,
  logout,
  getSession,
  updateRegistrationProgress,
  updateCart,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register/start", startRegistration);
router.post("/register/verify", verifyRegistrationCode);
router.post("/register", register);
router.post("/login", login);
router.post(
  "/login/totp",
  require("../middleware/requestRateLimit").createMemoryRateLimit({
    scope: "login-totp",
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many authenticator attempts. Please wait and sign in again.",
  }),
  verifyLoginTotp,
);
router.post("/logout", logout);
router.get("/session", getSession);
router.post("/session/registration", updateRegistrationProgress);
router.post("/session/cart", updateCart);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.get("/check-alias", checkAliasAvailability);
router.post("/forgot-password", requestPasswordReset);
router.post("/reset-password", resetPasswordWithCode);
router.post("/reset-password/:token", resetPassword);
router.get("/me", requireAuth, me);

module.exports = router;
