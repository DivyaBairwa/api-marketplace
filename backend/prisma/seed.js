const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

function newApiKey() {
  return crypto.randomBytes(32).toString("hex");
}

const QUOTA_PACKS = [
  { id: "starter", calls: 1000, price: 100, label: "Starter" },
  { id: "pro", calls: 10000, price: 800, label: "Pro" },
  { id: "enterprise", calls: 100000, price: 6000, label: "Enterprise" },
];

const CATALOG = [
  {
    name: "Weather API",
    slug: "weather",
    description: "Get current weather for any city. Returns temperature, humidity, conditions.",
    method: "GET",
    pricePerQuota: 100,
    quotaAmount: 1000,
    quotaPacks: QUOTA_PACKS,
    dummyResponse: {
      city: "San Francisco",
      country: "US",
      temperatureC: 18,
      temperatureF: 64.4,
      humidity: 72,
      conditions: "Partly cloudy",
      windKph: 12,
      observedAt: "2026-05-19T08:00:00Z",
    },
  },
  {
    name: "Joke API",
    slug: "joke",
    description: "Random programmer joke. Great for warming up a standup.",
    method: "GET",
    pricePerQuota: 50,
    quotaAmount: 1000,
    quotaPacks: QUOTA_PACKS,
    dummyResponse: {
      id: "j-42",
      setup: "Why did the developer go broke?",
      punchline: "Because he used up all his cache.",
      category: "programming",
    },
  },
  {
    name: "Currency Exchange API",
    slug: "currency",
    description: "Get live foreign-exchange rates with USD as base.",
    method: "GET",
    pricePerQuota: 200,
    quotaAmount: 1000,
    quotaPacks: QUOTA_PACKS,
    dummyResponse: {
      base: "USD",
      rates: { EUR: 0.92, GBP: 0.79, INR: 83.45, JPY: 156.2, CAD: 1.36 },
      updatedAt: "2026-05-19T08:00:00Z",
    },
  },
  {
    name: "Quote of the Day API",
    slug: "quote",
    description: "An inspirational quote with author attribution.",
    method: "GET",
    pricePerQuota: 50,
    quotaAmount: 1000,
    quotaPacks: QUOTA_PACKS,
    dummyResponse: {
      quote: "The best way to predict the future is to invent it.",
      author: "Alan Kay",
      tags: ["technology", "innovation"],
    },
  },
  {
    name: "News Headlines API",
    slug: "news",
    description: "Top news headlines across categories.",
    method: "GET",
    pricePerQuota: 150,
    quotaAmount: 1000,
    quotaPacks: QUOTA_PACKS,
    dummyResponse: {
      category: "technology",
      headlines: [
        { title: "AI breakthrough announced", source: "TechWire", url: "https://example.com/1" },
        { title: "Quantum chip milestone", source: "SciDaily", url: "https://example.com/2" },
        { title: "Open-source funding surges", source: "DevNews", url: "https://example.com/3" },
      ],
    },
  },
];

async function seed() {
  const cost = Number(process.env.BCRYPT_COST || 10);

  const adminEmail = "admin@marketplace.com";
  const adminPassword = "Admin@123";
  const userEmail = "user@marketplace.com";
  const userPassword = "User@123";

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, cost),
        role: "ADMIN",
        apiKey: newApiKey(),
      },
    });
    console.log(`  seeded admin: ${adminEmail} / ${adminPassword}`);
  }

  const existingUser = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: await bcrypt.hash(userPassword, cost),
        role: "USER",
        apiKey: newApiKey(),
      },
    });
    console.log(`  seeded user:  ${userEmail} / ${userPassword}`);
  }

  for (const api of CATALOG) {
    const existing = await prisma.catalogAPI.findUnique({ where: { slug: api.slug } });
    if (existing) continue;
    await prisma.catalogAPI.create({
      data: {
        ...api,
        endpoint: `/v1/${api.slug}`,
        quotaPacks: JSON.stringify(api.quotaPacks),
        dummyResponse: JSON.stringify(api.dummyResponse),
      },
    });
    console.log(`  seeded api:   ${api.slug}`);
  }
}

async function main() {
  console.log("Seeding database...");
  await seed();
  console.log("Done.");
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seed };
