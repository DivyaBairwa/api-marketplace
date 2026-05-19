const express = require("express");
const prisma = require("../prisma");
const rateLimiter = require("../middleware/rateLimit");
const { parseApi } = require("../lib/serialize");

const router = express.Router();

async function logCall({ userId, apiId, status, startedAt, ip, errorReason }) {
  if (!userId || !apiId) return;
  const responseTimeMs = Math.max(0, Date.now() - startedAt);
  try {
    await prisma.callLog.create({
      data: {
        userId,
        apiId,
        status,
        responseTimeMs,
        ipAddress: ip || "",
        errorReason: errorReason || null,
      },
    });
  } catch (e) {
    console.error("[meter] failed to write CallLog:", e.message);
  }
}

router.all("/:slug", async (req, res) => {
  const startedAt = Date.now();
  const ip = req.ip;
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || typeof apiKey !== "string") {
    return res
      .status(401)
      .json({
        error: {
          code: "missing_api_key",
          message: "x-api-key header required",
        },
      });
  }

  const user = await prisma.user.findUnique({ where: { apiKey } });
  if (!user) {
    return res
      .status(401)
      .json({ error: { code: "invalid_api_key", message: "Invalid API key" } });
  }

  const api = await prisma.catalogAPI.findUnique({
    where: { slug: req.params.slug },
  });
  if (!api || !api.isActive) {
    await logCall({
      userId: user.id,
      apiId: api ? api.id : null,
      status: 404,
      startedAt,
      ip,
      errorReason: "api_not_found",
    });
    return res
      .status(404)
      .json({ error: { code: "api_not_found", message: "API not found" } });
  }

  const limit = rateLimiter.check(apiKey);
  if (!limit.allowed) {
    await logCall({
      userId: user.id,
      apiId: api.id,
      status: 429,
      startedAt,
      ip,
      errorReason: "rate_limited",
    });
    return res
      .status(429)
      .json({
        error: {
          code: "rate_limited",
          message: "Too many requests; try again later",
        },
      });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId_catalogAPIId: { userId: user.id, catalogAPIId: api.id } },
  });
  if (!sub) {
    await logCall({
      userId: user.id,
      apiId: api.id,
      status: 403,
      startedAt,
      ip,
      errorReason: "no_subscription",
    });
    return res
      .status(403)
      .json({
        error: {
          code: "no_subscription",
          message: "No active subscription for this API",
        },
      });
  }
  if (sub.remainingCalls <= 0) {
    await logCall({
      userId: user.id,
      apiId: api.id,
      status: 429,
      startedAt,
      ip,
      errorReason: "quota_exhausted",
    });
    return res
      .status(429)
      .json({
        error: {
          code: "quota_exhausted",
          message: "Quota exhausted; top up to continue",
        },
      });
  }

  const result = await prisma.subscription.updateMany({
    where: { id: sub.id, remainingCalls: { gt: 0 } },
    data: { remainingCalls: { decrement: 1 } },
  });
  if (result.count === 0) {
    await logCall({
      userId: user.id,
      apiId: api.id,
      status: 429,
      startedAt,
      ip,
      errorReason: "quota_exhausted",
    });
    return res
      .status(429)
      .json({
        error: {
          code: "quota_exhausted",
          message: "Quota exhausted; top up to continue",
        },
      });
  }
  const remainingCalls = sub.remainingCalls - 1;

  await logCall({ userId: user.id, apiId: api.id, status: 200, startedAt, ip });
  const parsed = parseApi(api);
  res.json({ success: true, data: parsed.dummyResponse, remainingCalls });
});

module.exports = router;
