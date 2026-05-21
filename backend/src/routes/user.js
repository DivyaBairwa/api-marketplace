const express = require("express");
const prisma = require("../prisma");
const { authenticate } = require("../middleware/auth");
const { newApiKey } = require("../lib/apiKey");
const { logsToCsv } = require("../lib/csv");
const { parseApi } = require("../lib/serialize");
const { HttpError } = require("../errors");

const router = express.Router();

router.get("/catalog", authenticate, async (req, res, next) => {
  try {
    const apis = await prisma.catalogAPI.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    const subs = await prisma.subscription.findMany({
      where: { userId: req.user.id },
    });
    const subByApiId = new Map(subs.map((s) => [s.catalogAPIId, s]));
    const items = apis.map((a) => {
      const parsed = parseApi(a);
      const sub = subByApiId.get(a.id);
      return {
        id: parsed.id,
        name: parsed.name,
        slug: parsed.slug,
        description: parsed.description,
        endpoint: parsed.endpoint,
        method: parsed.method,
        pricePerQuota: parsed.pricePerQuota,
        quotaAmount: parsed.quotaAmount,
        quotaPacks: parsed.quotaPacks,
        dummyResponse: parsed.dummyResponse,
        subscription: sub
          ? { remainingCalls: sub.remainingCalls, totalPurchased: sub.totalPurchased }
          : null,
      };
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

router.post("/buy/:apiId", authenticate, async (req, res, next) => {
  try {
    const { apiId } = req.params;
    const { packId } = req.body || {};
    if (!packId) throw new HttpError(400, "missing_pack", "packId is required");

    const apiRow = await prisma.catalogAPI.findUnique({ where: { id: apiId } });
    if (!apiRow || !apiRow.isActive) throw new HttpError(404, "api_not_found", "API not found");
    const api = parseApi(apiRow);

    const packs = Array.isArray(api.quotaPacks) ? api.quotaPacks : [];
    const pack = packs.find((p) => p.id === packId);
    if (!pack) throw new HttpError(400, "invalid_pack", "Pack not available for this API");

    const existing = await prisma.subscription.findUnique({
      where: { userId_catalogAPIId: { userId: req.user.id, catalogAPIId: apiId } },
    });

    let sub;
    if (existing) {
      sub = await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          remainingCalls: { increment: pack.calls },
          totalPurchased: { increment: pack.calls },
        },
      });
    } else {
      sub = await prisma.subscription.create({
        data: {
          userId: req.user.id,
          catalogAPIId: apiId,
          remainingCalls: pack.calls,
          totalPurchased: pack.calls,
        },
      });
    }

    res.status(201).json({
      message: `Added ${pack.calls} calls to ${api.name}`,
      subscription: {
        id: sub.id,
        apiId,
        remainingCalls: sub.remainingCalls,
        totalPurchased: sub.totalPurchased,
        pack,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/dashboard", authenticate, async (req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user.id },
      include: { api: { select: { id: true, name: true, slug: true, endpoint: true, method: true } } },
      orderBy: { createdAt: "desc" },
    });
    const recentLogs = await prisma.callLog.findMany({
      where: { userId: req.user.id },
      include: { api: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    res.json({ subscriptions, recentLogs });
  } catch (e) {
    next(e);
  }
});

router.get("/my-key", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { apiKey: true },
    });
    if (!user) throw new HttpError(404, "user_not_found", "User no longer exists");
    res.json({ apiKey: user.apiKey });
  } catch (e) {
    next(e);
  }
});

router.post("/regenerate-key", authenticate, async (req, res, next) => {
  try {
    const apiKey = newApiKey();
    await prisma.user.update({ where: { id: req.user.id }, data: { apiKey } });
    res.json({ apiKey });
  } catch (e) {
    next(e);
  }
});

function parseLogFilters(query) {
  const where = {};
  if (query.apiId) where.apiId = String(query.apiId);
  if (query.status) {
    const s = parseInt(query.status, 10);
    if (!Number.isNaN(s)) where.status = s;
  }
  const createdAt = {};
  if (query.from) {
    const d = new Date(query.from);
    if (!Number.isNaN(d.valueOf())) createdAt.gte = d;
  }
  if (query.to) {
    const d = new Date(query.to);
    if (!Number.isNaN(d.valueOf())) createdAt.lte = d;
  }
  if (Object.keys(createdAt).length) where.createdAt = createdAt;
  return where;
}

router.get("/my-logs", authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "20", 10)));
    const where = { userId: req.user.id, ...parseLogFilters(req.query) };

    const [total, items] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.findMany({
        where,
        include: { api: { select: { name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    res.json({ items, total, page, pageSize });
  } catch (e) {
    next(e);
  }
});

router.get("/my-logs.csv", authenticate, async (req, res, next) => {
  try {
    const where = { userId: req.user.id, ...parseLogFilters(req.query) };
    const logs = await prisma.callLog.findMany({
      where,
      include: {
        api: { select: { name: true, slug: true } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50_000,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="my-logs-${Date.now()}.csv"`);
    res.send(logsToCsv(logs));
  } catch (e) {
    next(e);
  }
});

module.exports = router;
