const jwt = require("jsonwebtoken");
const User = require("../models/model");

async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;
  const match = typeof authorization === "string"
    ? authorization.match(/^Bearer\s+(\S+)$/i)
    : null;

  if (!match) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required.",
    });
  }

  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }

  if (!payload || typeof payload !== "object" || typeof payload.sub !== "string") {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }

  try {
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The account for this token no longer exists.",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to verify authentication right now.",
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }

    return next();
  };
}

module.exports = requireAuth;
module.exports.requireRole = requireRole;
