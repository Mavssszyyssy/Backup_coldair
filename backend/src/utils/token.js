const jwt = require("jsonwebtoken");
const env = require("../config/env");

const signAccessToken = (payload, options = {}) => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: options.expiresIn || "7d",
  });
};

module.exports = { signAccessToken };
