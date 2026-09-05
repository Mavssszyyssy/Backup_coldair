const jwt = require("jsonwebtoken");
const env = require("../config/env");

const signAccessToken = (payload, options = {}) => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: options.expiresIn || "7d",
  });
};

const signUserAccessToken = (user, extra = {}, options = {}) => signAccessToken({
  sub: user.id,
  role: user.role,
  securityVersion: Number(user.security?.sessionVersion || 0),
  ...extra,
}, options);

module.exports = { signAccessToken, signUserAccessToken };
