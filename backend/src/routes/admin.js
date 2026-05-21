const express = require("express");
const prisma = require("../prisma");
const { authenticate } = require("../middleware/auth");
const { adminOnly } = require("../middleware/admin");
const { logsToCsv } = require("../lib/csv");
const { parseApi, stringifyJsonFields } = require("../lib/serialize");
const { HttpError } = require("../errors");

const router = express.Router();

router.use(authenticate, adminOnly);

function validatePacks(packs) {
  if (!Array.isArray(packs)) throw new HttpError(400, "invalid_packs", "quotaPacks must be an array");
  for (const p of packs) {
    if (!p || typeof p !== "object") throw new HttpError(400, "invalid_packs", "Each pack must be an object");
    if (typeof p.id !== "string" || !p.id) throw new HttpError(400, "invalid_packs", "Pack id is required");
    if (typeof p.label !== "string" || !p.label) throw new HttpError(400, "invalid_packs", "Pack label is required");
    if (!Number.isFinite(p.calls) || p.calls <= 0) throw new HttpError(400, "invalid_packs", "Pack calls must be positive number");
    if (!Number.isFinite(p.price) || p.price < 0) throw new HttpError(400, "invalid_packs", "Pack price must be non-negative number");
  }
}

router.post("/api", async (req, res, next) => {
  try {
    const {
      name,
      description,
      slug,
      method,
      pricePerQuota,
      quotaAmount,
      quotaPacks,
      dummyResponse,
      isActive,
    } = req.body || {};
    if (!name || !slug) throw new HttpError(400, "missing_fields", "name and slug are required");
    if (!/^[a-z0-9-]+$/.test(slug)) throw new HttpError(400, "invalid_slug", "slug must be lowercase alphanumeric with hyphens");
    validatePacks(quotaPacks);

    const created = await prisma.catalogAPI.create({
      data: stringifyJsonFields({
        name,
        description: description || "",
        slug,
        endpoint: `/v1/${slug}`,
        method: method || "GET",
        pricePerQuota: Number(pricePerQuota || 0),
        quotaAmount: Number(quotaAmount || 0),
        quotaPacks,
        dummyResponse: dummyResponse || {},
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      }),
    });
    res.status(201).json(parseApi(created));
  } catch (e) {
    next(e);
  }
});

router.put("/api/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.catalogAPI.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "api_not_found", "API not found");

    const data = {};
    const fields = ["name", "description", "method", "dummyResponse", "isActive"];
    for (const f of fields) if (f in req.body) data[f] = req.body[f];
    if ("pricePerQuota" in req.body) data.pricePerQuota = Number(req.body.pricePerQuota);
    if ("quotaAmount" in req.body) data.quotaAmount = Number(req.body.quotaAmount);
    if ("quotaPacks" in req.body) {
      validatePacks(req.body.quotaPacks);
      data.quotaPacks = req.body.quotaPacks;
    }
    if ("slug" in req.body && req.body.slug !== existing.slug) {
      if (!/^[a-z0-9-]+$/.test(req.body.slug)) {
        throw new HttpError(400, "invalid_slug", "slug must be lowercase alphanumeric with hyphens");
      }
      data.slug = req.body.slug;
      data.endpoint = `/v1/${req.body.slug}`;
    }

    const updated = await prisma.catalogAPI.update({
      where: { id },
      data: stringifyJsonFields(data),
    });
    res.json(parseApi(updated));
  } catch (e) {
    next(e);
  }
});

router.delete("/api/:id", async (req, res, next) => {
  try {
    await prisma.catalogAPI.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === "P2025") return next(new HttpError(404, "api_not_found", "API not found"));
    next(e);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize || "20", 10)));
    const where = {};
    if (req.query.email) where.email = { contains: String(req.query.email) };
    if (req.query.role) where.role = String(req.query.role);

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { subscriptions: true, callLogs: true } },
        },
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

router.get("/users/:id/subscriptions", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true },
    });
    if (!user) throw new HttpError(404, "user_not_found", "User not found");

    const items = await prisma.subscription.findMany({
      where: { userId: user.id },
      include: {
        api: { select: { id: true, name: true, slug: true, endpoint: true, method: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ user, items });
  } catch (e) {
    next(e);
  }
});

router.put("/subscriptions/:id/calls", async (req, res, next) => {
  try {
    const remainingCalls = Number(req.body?.remainingCalls);
    const totalPurchased = Number(req.body?.totalPurchased);

    if (!Number.isInteger(remainingCalls) || remainingCalls < 0) {
      throw new HttpError(400, "invalid_remaining_calls", "remainingCalls must be a non-negative integer");
    }
    if (!Number.isInteger(totalPurchased) || totalPurchased < 0) {
      throw new HttpError(400, "invalid_total_purchased", "totalPurchased must be a non-negative integer");
    }
    if (remainingCalls > totalPurchased) {
      throw new HttpError(400, "invalid_calls", "remainingCalls cannot be greater than totalPurchased");
    }

    const updated = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { remainingCalls, totalPurchased },
      include: {
        api: { select: { id: true, name: true, slug: true, endpoint: true, method: true } },
        user: { select: { id: true, email: true } },
      },
    });

    res.json(updated);
  } catch (e) {
    if (e.code === "P2025") return next(new HttpError(404, "subscription_not_found", "Subscription not found"));
    next(e);
  }
});

function parseLogFilters(query) {
  const where = {};
  if (query.apiId) where.apiId = String(query.apiId);
  if (query.userId) where.userId = String(query.userId);
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

router.get("/logs", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize || "20", 10)));
    const where = parseLogFilters(req.query);

    const [total, items] = await Promise.all([
      prisma.callLog.count({ where }),
      prisma.callLog.findMany({
        where,
        include: {
          api: { select: { name: true, slug: true } },
          user: { select: { email: true } },
        },
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

router.get("/logs.csv", async (req, res, next) => {
  try {
    const where = parseLogFilters(req.query);
    const logs = await prisma.callLog.findMany({
      where,
      include: {
        api: { select: { name: true, slug: true } },
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100_000,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="admin-logs-${Date.now()}.csv"`);
    res.send(logsToCsv(logs));
  } catch (e) {
    next(e);
  }
});

router.get("/dashboard", async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalApis, totalSubscriptions, callsToday, calls24h, calls7d] = await Promise.all([
      prisma.user.count(),
      prisma.catalogAPI.count(),
      prisma.subscription.count(),
      prisma.callLog.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.callLog.count({ where: { createdAt: { gte: last24h } } }),
      prisma.callLog.count({ where: { createdAt: { gte: last7d } } }),
    ]);

    const topApisRaw = await prisma.callLog.groupBy({
      by: ["apiId"],
      _count: { _all: true },
      orderBy: { _count: { apiId: "desc" } },
      take: 5,
    });
    const apiMap = new Map(
      (await prisma.catalogAPI.findMany({ where: { id: { in: topApisRaw.map((r) => r.apiId) } } }))
        .map((a) => [a.id, a]),
    );
    const topApis = topApisRaw.map((r) => ({
      apiId: r.apiId,
      name: apiMap.get(r.apiId)?.name || "(deleted)",
      slug: apiMap.get(r.apiId)?.slug || "",
      calls: r._count._all,
    }));

    const topUsersRaw = await prisma.callLog.groupBy({
      by: ["userId"],
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 5,
    });
    const userMap = new Map(
      (await prisma.user.findMany({
        where: { id: { in: topUsersRaw.map((r) => r.userId) } },
        select: { id: true, email: true },
      })).map((u) => [u.id, u]),
    );
    const topUsers = topUsersRaw.map((r) => ({
      userId: r.userId,
      email: userMap.get(r.userId)?.email || "(deleted)",
      calls: r._count._all,
    }));

    const recentCalls = await prisma.callLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        api: { select: { name: true, slug: true } },
        user: { select: { email: true } },
      },
    });

    res.json({
      totals: { users: totalUsers, apis: totalApis, subscriptions: totalSubscriptions, callsToday, calls24h, calls7d },
      topApis,
      topUsers,
      recentCalls,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
