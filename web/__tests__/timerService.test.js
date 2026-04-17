import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import timerService from "../services/timerService.js";
import Timer from "../models/Timer.js";

let mongoServer;
const SHOP = "test-store.myshopify.com";
const SHOP_B = "other-store.myshopify.com";

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Timer.deleteMany({});
});

// ── Helpers ──
const fixedData = (overrides = {}) => ({
  title: "Summer Sale",
  timerType: "fixed",
  startDate: new Date(Date.now() - 86400000),
  endDate: new Date(Date.now() + 86400000),
  targetType: "all",
  ...overrides,
});

const evergreenData = (overrides = {}) => ({
  title: "Flash Deal",
  timerType: "evergreen",
  evergreenDuration: 60,
  targetType: "all",
  ...overrides,
});

// ── CRUD Tests ──

describe("TimerService — CRUD", () => {
  it("create() should save and return a timer with shop", async () => {
    const timer = await timerService.create(SHOP, fixedData());
    expect(timer._id).toBeDefined();
    expect(timer.shop).toBe(SHOP);
    expect(timer.title).toBe("Summer Sale");
    expect(timer.impressions).toBe(0);
  });

  it("listByShop() should return only timers for that shop", async () => {
    await timerService.create(SHOP, fixedData({ title: "A" }));
    await timerService.create(SHOP, evergreenData({ title: "B" }));
    await timerService.create(SHOP_B, fixedData({ title: "C" }));

    const list = await timerService.listByShop(SHOP);
    expect(list).toHaveLength(2);
    expect(list.every((t) => t.shop === SHOP)).toBe(true);
  });

  it("listByShop() should return newest first", async () => {
    const a = await timerService.create(SHOP, fixedData({ title: "First" }));
    const b = await timerService.create(SHOP, fixedData({ title: "Second" }));
    const list = await timerService.listByShop(SHOP);
    expect(list[0].title).toBe("Second");
    expect(list[1].title).toBe("First");
  });

  it("getById() should return the timer for the correct shop", async () => {
    const created = await timerService.create(SHOP, fixedData());
    const found = await timerService.getById(created._id, SHOP);
    expect(found.title).toBe("Summer Sale");
  });

  it("getById() should throw NotFoundError for wrong shop", async () => {
    const created = await timerService.create(SHOP, fixedData());
    await expect(timerService.getById(created._id, SHOP_B)).rejects.toThrow(
      "Timer not found"
    );
  });

  it("getById() should throw NotFoundError for non-existent ID", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    await expect(timerService.getById(fakeId, SHOP)).rejects.toThrow(
      "Timer not found"
    );
  });

  it("update() should modify only allowed fields", async () => {
    const created = await timerService.create(SHOP, fixedData());
    const updated = await timerService.update(created._id, SHOP, {
      title: "Updated Title",
      description: "New desc",
    });
    expect(updated.title).toBe("Updated Title");
    expect(updated.description).toBe("New desc");
    expect(updated.shop).toBe(SHOP); // shop not changed
  });

  it("update() should throw NotFoundError for wrong shop", async () => {
    const created = await timerService.create(SHOP, fixedData());
    await expect(
      timerService.update(created._id, SHOP_B, { title: "Hacked" })
    ).rejects.toThrow("Timer not found");
  });

  it("delete() should remove the timer", async () => {
    const created = await timerService.create(SHOP, fixedData());
    await timerService.delete(created._id, SHOP);
    const count = await Timer.countDocuments({ shop: SHOP });
    expect(count).toBe(0);
  });

  it("delete() should throw NotFoundError for wrong shop", async () => {
    const created = await timerService.create(SHOP, fixedData());
    await expect(timerService.delete(created._id, SHOP_B)).rejects.toThrow(
      "Timer not found"
    );
  });

  it("toggle() should flip isActive", async () => {
    const created = await timerService.create(SHOP, fixedData());
    expect(created.isActive).toBe(true);

    const toggled = await timerService.toggle(created._id, SHOP);
    expect(toggled.isActive).toBe(false);

    const toggledBack = await timerService.toggle(created._id, SHOP);
    expect(toggledBack.isActive).toBe(true);
  });

  it("toggle() should throw NotFoundError for wrong shop", async () => {
    const created = await timerService.create(SHOP, fixedData());
    await expect(timerService.toggle(created._id, SHOP_B)).rejects.toThrow(
      "Timer not found"
    );
  });

  it("deleteAllByShop() should remove all timers for a shop", async () => {
    await timerService.create(SHOP, fixedData({ title: "A" }));
    await timerService.create(SHOP, evergreenData({ title: "B" }));
    await timerService.create(SHOP_B, fixedData({ title: "C" }));

    const result = await timerService.deleteAllByShop(SHOP);
    expect(result.deletedCount).toBe(2);

    const remaining = await Timer.countDocuments({});
    expect(remaining).toBe(1);
  });
});

// ── Storefront Tests ──

describe("TimerService — Storefront", () => {
  it("should return active fixed timers within date range", async () => {
    await timerService.create(SHOP, fixedData({ title: "Active" }));
    await timerService.create(
      SHOP,
      fixedData({
        title: "Expired",
        startDate: new Date(Date.now() - 172800000),
        endDate: new Date(Date.now() - 86400000),
      })
    );

    const results = await timerService.getActiveTimersForStorefront(SHOP, null, []);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("fixed");
  });

  it("should return evergreen timers (always active)", async () => {
    await timerService.create(SHOP, evergreenData());
    const results = await timerService.getActiveTimersForStorefront(SHOP, null, []);
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("evergreen");
    expect(results[0].duration).toBe(60);
  });

  it("should NOT return inactive timers", async () => {
    await timerService.create(SHOP, evergreenData({ isActive: false }));
    const results = await timerService.getActiveTimersForStorefront(SHOP, null, []);
    expect(results).toHaveLength(0);
  });

  it("should match targetType=all for any product", async () => {
    await timerService.create(SHOP, evergreenData({ targetType: "all" }));
    const results = await timerService.getActiveTimersForStorefront(
      SHOP,
      "gid://shopify/Product/999",
      []
    );
    expect(results).toHaveLength(1);
  });

  it("should match specific_products targeting", async () => {
    await timerService.create(
      SHOP,
      evergreenData({
        targetType: "specific_products",
        targetProductIds: ["gid://shopify/Product/123"],
      })
    );
    await timerService.create(
      SHOP,
      evergreenData({
        title: "Other Product",
        targetType: "specific_products",
        targetProductIds: ["gid://shopify/Product/789"],
      })
    );

    const results = await timerService.getActiveTimersForStorefront(
      SHOP,
      "gid://shopify/Product/123",
      []
    );
    expect(results).toHaveLength(1);
  });

  it("should match specific_collections targeting", async () => {
    await timerService.create(
      SHOP,
      evergreenData({
        targetType: "specific_collections",
        targetCollectionIds: ["gid://shopify/Collection/10", "gid://shopify/Collection/20"],
      })
    );

    const results = await timerService.getActiveTimersForStorefront(
      SHOP,
      null,
      ["gid://shopify/Collection/20"]
    );
    expect(results).toHaveLength(1);
  });

  it("should NOT match wrong product", async () => {
    await timerService.create(
      SHOP,
      evergreenData({
        targetType: "specific_products",
        targetProductIds: ["gid://shopify/Product/123"],
      })
    );

    const results = await timerService.getActiveTimersForStorefront(
      SHOP,
      "gid://shopify/Product/999",
      []
    );
    expect(results).toHaveLength(0);
  });

  it("should return minimal widget payload shape", async () => {
    await timerService.create(SHOP, evergreenData());
    const results = await timerService.getActiveTimersForStorefront(SHOP, null, []);

    const timer = results[0];
    expect(timer).toHaveProperty("id");
    expect(timer).toHaveProperty("type");
    expect(timer).toHaveProperty("duration");
    expect(timer).toHaveProperty("style");
    // Should NOT include shop, impressions, createdAt, etc.
    expect(timer).not.toHaveProperty("shop");
    expect(timer).not.toHaveProperty("impressions");
    expect(timer).not.toHaveProperty("createdAt");
  });

  it("trackImpression() should increment atomically", async () => {
    const timer = await timerService.create(SHOP, evergreenData());

    await timerService.trackImpression(timer._id, SHOP);
    await timerService.trackImpression(timer._id, SHOP);
    await timerService.trackImpression(timer._id, SHOP);

    const updated = await Timer.findById(timer._id);
    expect(updated.impressions).toBe(3);
  });

  it("trackImpression() should not increment for wrong shop", async () => {
    const timer = await timerService.create(SHOP, evergreenData());
    await timerService.trackImpression(timer._id, SHOP_B);

    const check = await Timer.findById(timer._id);
    expect(check.impressions).toBe(0);
  });
});
