require("dotenv").config();

const required = ["JWT_SECRET", "DATABASE_URL"];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] WARNING: ${key} is not set`);
  }
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-do-not-use-in-prod",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  bcryptCost: Number(process.env.BCRYPT_COST || 10),
  rateLimitPerSecond: Number(process.env.RATE_LIMIT_PER_SECOND || 10),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  isProd: process.env.NODE_ENV === "production",
};
