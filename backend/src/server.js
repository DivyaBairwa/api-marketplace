const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { port, corsOrigin } = require("./config");
const prisma = require("./prisma");
const { notFound, errorHandler } = require("./errors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const meterRoutes = require("./routes/meter");

const app = express();
app.set("trust proxy", true);
app.use(helmet());
app.use(
  cors({
    origin: corsOrigin.split(",").map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/v1", meterRoutes);
app.use("/", userRoutes);

app.use(notFound);
app.use(errorHandler);

async function maybeSeed() {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log("Database empty - running seed...");
      const { seed } = require("../prisma/seed");
      await seed();
    }
  } catch (e) {
    console.warn("[startup] seed check failed:", e.message);
  }
}

async function main() {
  await maybeSeed();
  app.listen(port, () => {
    console.log(`API Marketplace backend listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
