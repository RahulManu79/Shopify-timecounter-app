import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import express from "express";
import request from "supertest";
import Timer from "../models/Timer.js";
import timerRoutes from "../routes/timers.js";
import storefrontRoutes from "../routes/storefront.js";
import { errorHandler } from "../middleware/errorHandler.js";

let mongoServer;
const SHOP = "integration-test.myshopify.com";

/**
 * Build a minimal Express app wired like production but without
 * Shopify auth — we inject the shop via a stub middleware.
 */
function createApp() {
  const app = express();
  app.use(express.json());

  // Stub Shopify session for admin routes
  app.use("/api/timers", (req, res, next) => {
    res.locals.shopify = { session: { shop: SHOP } };
    next();
  });
  app.use("/api/timers", timerRoutes);

  // Storefront routes (skip HMAC in tests — no signature)
  // We set NODE_ENV=development so HMAC middleware skips
  app.use("/api/storefront", storefrontRoutes);

  app.use(errorHandler);
  return app;
}

let app;

beforeAll(async () => {
  process.env.NODE_ENV = "development"; // Allow HMAC bypass
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Timer.deleteMany({});
});

// ── Helpers ──

const validFixed = {
  title: "Integration Sale",
  timerType: "fixed",
  startDate: new Date(Date.now() - 86400000).toISOString(),
  endDate: new Date(Date.now() + 86400000).toISOString(),
  targetType: "all",
};

const validEvergreen = {
  title: "Evergreen Deal",
  timerType: "evergreen",
  evergreenDuration: 120,
  targetType: "all",
};

// ──────────────────────────────────────
//  Admin CRUD Routes
// ──────────────────────────────────────

describe("POST /api/timers — create", () => {
  it("creates a timer and returns 201", async () => {
    const res = await request(app)
      .post("/api/timers")
      .send(validFixed)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.timer.title).toBe("Integration Sale");
    expect(res.body.timer.shop).toBe(SHOP);
  });

  it("rejects missing title with 400", async () => {
    const res = await request(app)
      .post("/api/timers")
      .send({ timerType: "fixed" })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some((e) => e.field === "title")).toBe(true);
  });

  it("rejects endDate before startDate", async () => {
    const res = await request(app)
      .post("/api/timers")
      .send({
        ...validFixed,
        endDate: new Date(Date.now() - 172800000).toISOString(),
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it("strips unknown fields", async () => {
    const res = await request(app)
      .post("/api/timers")
      .send({ ...validFixed, maliciousField: "drop table" })
      .expect(201);

    expect(res.body.timer.maliciousField).toBeUndefined();
  });
});

describe("GET /api/timers — list", () => {
  it("returns all timers for the shop", async () => {
    await request(app).post("/api/timers").send(validFixed);
    await request(app).post("/api/timers").send(validEvergreen);

    const res = await request(app).get("/api/timers").expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.timers).toHaveLength(2);
  });

  it("returns newest first", async () => {
    await request(app).post("/api/timers").send(validFixed);
    await request(app)
      .post("/api/timers")
      .send({ ...validEvergreen, title: "Newer" });

    const res = await request(app).get("/api/timers").expect(200);
    expect(res.body.timers[0].title).toBe("Newer");
  });
});

describe("GET /api/timers/:id — get by ID", () => {
  it("returns a specific timer", async () => {
    const create = await request(app).post("/api/timers").send(validFixed);
    const id = create.body.timer._id;

    const res = await request(app).get(`/api/timers/${id}`).expect(200);
    expect(res.body.timer._id).toBe(id);
  });

  it("returns 404 for non-existent ID", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await request(app).get(`/api/timers/${fakeId}`).expect(404);
  });

  it("returns 400 for invalid ID format", async () => {
    await request(app).get("/api/timers/not-a-valid-id").expect(400);
  });
});

describe("PUT /api/timers/:id — update", () => {
  it("updates title", async () => {
    const create = await request(app).post("/api/timers").send(validFixed);
    const id = create.body.timer._id;

    const res = await request(app)
      .put(`/api/timers/${id}`)
      .send({ title: "Updated Title" })
      .expect(200);

    expect(res.body.timer.title).toBe("Updated Title");
  });
});

describe("DELETE /api/timers/:id — delete", () => {
  it("deletes a timer", async () => {
    const create = await request(app).post("/api/timers").send(validFixed);
    const id = create.body.timer._id;

    await request(app).delete(`/api/timers/${id}`).expect(200);

    const list = await request(app).get("/api/timers");
    expect(list.body.timers).toHaveLength(0);
  });
});

describe("POST /api/timers/:id/toggle — toggle active", () => {
  it("toggles isActive from true to false", async () => {
    const create = await request(app).post("/api/timers").send(validFixed);
    const id = create.body.timer._id;

    const res = await request(app).post(`/api/timers/${id}/toggle`).expect(200);
    expect(res.body.timer.isActive).toBe(false);
  });
});

// ──────────────────────────────────────
//  Storefront Routes
// ──────────────────────────────────────

describe("GET /api/storefront/timers — public endpoint", () => {
  it("returns active timers with Cache-Control header", async () => {
    await request(app).post("/api/timers").send(validFixed);

    const res = await request(app)
      .get(`/api/storefront/timers?shop=${SHOP}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.timers.length).toBeGreaterThanOrEqual(1);
    expect(res.headers["cache-control"]).toContain("max-age=");
  });

  it("returns minimal widget payload", async () => {
    await request(app).post("/api/timers").send(validFixed);

    const res = await request(app)
      .get(`/api/storefront/timers?shop=${SHOP}`)
      .expect(200);

    const timer = res.body.timers[0];
    expect(timer).toHaveProperty("id");
    expect(timer).toHaveProperty("type");
    expect(timer).toHaveProperty("style");
    // Should NOT include admin fields
    expect(timer.title).toBeUndefined();
    expect(timer.shop).toBeUndefined();
  });

  it("rejects missing shop param", async () => {
    await request(app).get("/api/storefront/timers").expect(400);
  });

  it("filters by productId targeting", async () => {
    await request(app)
      .post("/api/timers")
      .send({
        ...validFixed,
        title: "Specific Product",
        targetType: "specific_products",
        targetProductIds: ["gid://shopify/Product/111"],
      });

    // Match
    const match = await request(app)
      .get(`/api/storefront/timers?shop=${SHOP}&productId=gid://shopify/Product/111`)
      .expect(200);
    expect(match.body.timers).toHaveLength(1);

    // No match
    const noMatch = await request(app)
      .get(`/api/storefront/timers?shop=${SHOP}&productId=gid://shopify/Product/999`)
      .expect(200);
    expect(noMatch.body.timers).toHaveLength(0);
  });
});

describe("POST /api/storefront/impression — track impressions", () => {
  it("increments impression count", async () => {
    const create = await request(app).post("/api/timers").send(validFixed);
    const id = create.body.timer._id;

    await request(app)
      .post("/api/storefront/impression")
      .send({ timerId: id, shop: SHOP })
      .expect(200);

    const updated = await request(app).get(`/api/timers/${id}`);
    expect(updated.body.timer.impressions).toBe(1);
  });

  it("rejects missing timerId", async () => {
    await request(app)
      .post("/api/storefront/impression")
      .send({ shop: SHOP })
      .expect(400);
  });
});
