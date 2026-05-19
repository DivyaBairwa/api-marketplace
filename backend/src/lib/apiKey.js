const crypto = require("crypto");

function newApiKey() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = { newApiKey };
