const bcrypt = require("bcryptjs");
const { bcryptCost } = require("../config");

function hashPassword(plain) {
  return bcrypt.hash(plain, bcryptCost);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
