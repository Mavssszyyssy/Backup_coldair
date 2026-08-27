const User = require("../models/User");
const { signAccessToken } = require("../utils/token");
const {
  buildTotpSetup,
  decryptSecret,
  encryptSecret,
  findRecoveryCodeIndex,
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
  verifyTotpCode,
} = require("../domain/accountSecurity");

const normalizeIdentifier = (value = "") => String(value).trim().toLowerCase();
const normalizePhone = (value = "") => String(value).replace(/\D/g, "");
const displayAccountName = (user = {}) => user.email || user.alias || user.username || user.id || "account";

const securityStatus = (user = {}) => ({
  totpEnabled: Boolean(user.security?.totpEnabled),
  totpResetRequired: Boolean(user.security?.totpResetRequired),
  totpSetupPending: Boolean(user.security?.totpPendingSecretEncrypted),
  recoveryCodesConfigured: Number(user.security?.recoveryCodesRemaining || 0) > 0,
  recoveryCodesRemaining: Number(user.security?.recoveryCodesRemaining || 0),
  recoveryCodesGeneratedAt: user.security?.recoveryCodesGeneratedAt || null,
});

const getSecurityStatus = async (req, res) => {
  const user = await User.findById(req.authUser._id).select("+security.totpPendingSecretEncrypted");
  if (!user) return res.status(404).json({ message: "Account not found." });
  return res.json({ security: securityStatus(user) });
};

const beginTotpSetup = async (req, res) => {
  try {
    const user = await User.findById(req.authUser._id).select("+security.totpPendingSecretEncrypted");
    if (!user) return res.status(404).json({ message: "Account not found." });
    let secret = "";
    if (user.security?.totpPendingSecretEncrypted && req.body?.regenerate !== true) {
      try {
        secret = decryptSecret(user.security.totpPendingSecretEncrypted);
      } catch (_error) {
        secret = "";
      }
    }
    let provisioningUri = "";
    if (!secret) {
      const setup = buildTotpSetup({ accountName: displayAccountName(user) });
      secret = setup.secret;
      provisioningUri = setup.provisioningUri;
      user.security = user.security || {};
      user.security.totpPendingSecretEncrypted = encryptSecret(secret);
      await user.save();
    } else {
      const issuer = encodeURIComponent("ColdAir");
      const account = encodeURIComponent(displayAccountName(user));
      provisioningUri = `otpauth://totp/${issuer}:${account}?secret=${encodeURIComponent(secret)}&issuer=${issuer}`;
    }
    return res.json({
      secret,
      provisioningUri,
      security: securityStatus(user),
    });
  } catch (error) {
    console.error("Unable to begin authenticator setup:", error.message);
    return res.status(500).json({ message: "Unable to start authenticator setup." });
  }
};

const verifyTotpSetup = async (req, res) => {
  try {
    const user = await User.findById(req.authUser._id).select("+security.totpPendingSecretEncrypted");
    if (!user?.security?.totpPendingSecretEncrypted) {
      return res.status(400).json({ message: "Start authenticator setup before verifying a code." });
    }
    let secret;
    try {
      secret = decryptSecret(user.security.totpPendingSecretEncrypted);
    } catch (_error) {
      return res.status(400).json({ message: "Authenticator setup expired. Generate a new setup code." });
    }
    if (!verifyTotpCode({ secret, code: req.body?.code })) {
      return res.status(400).json({ message: "Incorrect authenticator code." });
    }
    user.security.totpSecretEncrypted = user.security.totpPendingSecretEncrypted;
    user.security.totpPendingSecretEncrypted = "";
    user.security.totpEnabled = true;
    user.security.totpResetRequired = false;
    user.security.totpVerifiedAt = new Date();
    await user.save();
    const token = signAccessToken({ sub: user.id, role: user.role });
    return res.json({
      message: "Authenticator verification enabled.",
      security: securityStatus(user),
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error("Unable to verify authenticator setup:", error.message);
    return res.status(500).json({ message: "Unable to verify the authenticator code." });
  }
};

const listRecoveryCodes = async (req, res) => res.json({
  codes: [],
  shownOnce: true,
  security: securityStatus(req.authUser),
});

const regenerateRecoveryCodes = async (req, res) => {
  const codes = generateRecoveryCodes();
  const user = await User.findById(req.authUser._id).select("+security.recoveryCodeHashes");
  if (!user) return res.status(404).json({ message: "Account not found." });
  user.security = user.security || {};
  user.security.recoveryCodeHashes = codes.map(hashRecoveryCode);
  user.security.recoveryCodesRemaining = codes.length;
  user.security.recoveryCodesGeneratedAt = new Date();
  await user.save();
  return res.json({
    codes: codes.map((code) => ({ code, used: false })),
    shownOnce: true,
    security: securityStatus(user),
  });
};

const consumeRecoveryCode = async (req, res) => {
  try {
    const identifier = normalizeIdentifier(req.body?.identifier || req.body?.email || "");
    const normalizedCode = normalizeRecoveryCode(req.body?.code);
    if (!identifier || normalizedCode.length !== 12) {
      return res.status(400).json({ message: "Enter your account identifier and 12-character recovery code." });
    }
    const phone = normalizePhone(identifier);
    const conditions = [
      { email: identifier },
      { alias: identifier },
      { username: identifier },
    ];
    if (phone) conditions.push({ phone });
    const user = await User.findOne({ $or: conditions }).select(
      "+security.recoveryCodeHashes +security.totpSecretEncrypted +security.totpPendingSecretEncrypted",
    );
    if (!user || user.isDeleted || ["disabled", "deleted"].includes(String(user.accountStatus || ""))) {
      return res.status(400).json({ message: "Invalid or already-used recovery code." });
    }
    const hashes = Array.isArray(user.security?.recoveryCodeHashes)
      ? user.security.recoveryCodeHashes
      : [];
    const matchIndex = findRecoveryCodeIndex(hashes, normalizedCode);
    if (matchIndex < 0) {
      return res.status(400).json({ message: "Invalid or already-used recovery code." });
    }
    hashes.splice(matchIndex, 1);
    user.security.recoveryCodeHashes = hashes;
    user.security.recoveryCodesRemaining = hashes.length;
    user.security.totpEnabled = false;
    user.security.totpResetRequired = true;
    user.security.totpSecretEncrypted = "";
    user.security.totpPendingSecretEncrypted = "";
    user.security.recoveredAt = new Date();
    user.lastLogin = new Date();
    await user.save();
    const token = signAccessToken(
      { sub: user.id, role: user.role, recovery: true },
      { expiresIn: "15m" },
    );
    return res.json({
      success: true,
      token,
      user: user.toJSON(),
      requiresTotpReset: true,
      recoveryDestination: user.role === "technician"
        ? "/technician/oobe/reset"
        : "/customer/oobe/reset",
    });
  } catch (error) {
    console.error("Recovery code verification failed:", error.message);
    return res.status(500).json({ message: "Unable to verify the recovery code." });
  }
};

module.exports = {
  beginTotpSetup,
  consumeRecoveryCode,
  getSecurityStatus,
  listRecoveryCodes,
  regenerateRecoveryCodes,
  verifyTotpSetup,
};
