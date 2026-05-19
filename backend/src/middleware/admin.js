const { HttpError } = require("../errors");

function adminOnly(req, _res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return next(new HttpError(403, "forbidden", "Admin access required"));
  }
  next();
}

module.exports = { adminOnly };
