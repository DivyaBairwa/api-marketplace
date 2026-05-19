const express = require("express");
const prisma = require("../prisma");
const { hashPassword, verifyPassword } = require("../lib/password");
const { signToken } = require("../lib/token");
const { newApiKey } = require("../lib/apiKey");
const { toPublicUser } = require("../lib/sanitize");
const { HttpError } = require("../errors");

const router = express.Router();

function validEmail(s) {
  return typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

router.post("/signup", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!validEmail(email)) throw new HttpError(400, "invalid_email", "Invalid email format");
    if (!password || typeof password !== "string" || password.length < 8) {
      throw new HttpError(400, "weak_password", "Password must be at least 8 characters");
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "email_taken", "Email already registered");

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        apiKey: newApiKey(),
        role: "USER",
      },
    });
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) throw new HttpError(400, "missing_credentials", "Email and password required");
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, "invalid_credentials", "Invalid email or password");
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "invalid_credentials", "Invalid email or password");
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: toPublicUser(user) });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
