const { verifyToken } = require("../lib/token");
const { HttpError } = require("../errors");

function authenticate(req, _res, next) {
  const header = req.headers["authorization"];
  if (!header || !header.startsWith("Bearer ")) {
    return next(new HttpError(401, "missing_token", "Authorization header missing"));
  }
  const token = header.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch (_e) {
    next(new HttpError(401, "invalid_token", "Invalid or expired token"));
  }
}

module.exports = { authenticate };
