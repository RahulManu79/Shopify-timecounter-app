import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Timer from "../models/Timer.js";

let mongoServer;

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

describe("Timer Model", () => {
  // Test 1: Creating a valid fixed timer
  it("should create a valid fixed timer", async () => {
    const timer = await Timer.create({
      shop: "test-store.myshopify.com",
      title: "Summer Sale",
      timerType: "fixed",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-30"),
      targetType: "all",
    });

    expect(timer._id).toBeDefined();
    expect(timer.title).toBe("Summer Sale");
    expect(timer.timerType).toBe("fixed");
    expect(timer.impressions).toBe(0);
    expect(timer.isActive).toBe(true);
  });

  // Test 2: Creating a valid evergreen timer
  it("should create a valid evergreen timer", async () => {
    const timer = await Timer.create({
      shop: "test-store.myshopify.com",
      title: "Flash Deal",
      timerType: "evergreen",
      evergreenDuration: 30,
      targetType: "all",
    });

    expect(timer.evergreenDuration).toBe(30);
    expect(timer.timerType).toBe("evergreen");
  });

  // Test 3: Status virtual - active fixed timer
  it("should return correct status for an active fixed timer", async () => {
    const timer = await Timer.create({
      shop: "test-store.myshopify.com",
      title: "Active Sale",
      timerType: "fixed",
      startDate: new Date(Date.now() - 86400000), // yesterday
      endDate: new Date(Date.now() + 86400000), // tomorrow
      targetType: "all",
    });

    expect(timer.status).toBe("active");
  });

  // Test 4: Status virtual - scheduled timer
  it("should return 'scheduled' for a future fixed timer", async () => {
    const timer = await Timer.create({
      shop: "test-store.myshopify.com",
      title: "Upcoming Sale",
      timerType: "fixed",
      startDate: new Date(Date.now() + 86400000), // tomorrow
      endDate: new Date(Date.now() + 172800000), // day after
      targetType: "all",
    });

    expect(timer.status).toBe("scheduled");
  });

  // Test 5: Status virtual - expired timer
  it("should return 'expired' for a past fixed timer", async () => {
    const timer = await Timer.create({
      shop: "test-store.myshopify.com",
      title: "Old Sale",
      timerType: "fixed",
      startDate: new Date(Date.now() - 172800000), // 2 days ago
      endDate: new Date(Date.now() - 86400000), // yesterday
      targetType: "all",
    });

    expect(timer.status).toBe("expired");
  });

  // Test 6: Validation - reject invalid timer type
  it("should reject an invalid timer type", async () => {
    await expect(
      Timer.create({
        shop: "test-store.myshopify.com",
        title: "Bad Timer",
        timerType: "invalid",
        targetType: "all",
      })
    ).rejects.toThrow();
  });

  // Test 7: Validation - require title
  it("should require a title", async () => {
    await expect(
      Timer.create({
        shop: "test-store.myshopify.com",
        timerType: "fixed",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
      })
    ).rejects.toThrow();
  });

  // Test 8: Multi-tenant isolation
  it("should isolate timers by shop", async () => {
    await Timer.create({
      shop: "store-a.myshopify.com",
      title: "Store A Timer",
      timerType: "evergreen",
      evergreenDuration: 60,
      targetType: "all",
    });
    await Timer.create({
      shop: "store-b.myshopify.com",
      title: "Store B Timer",
      timerType: "evergreen",
      evergreenDuration: 60,
      targetType: "all",
    });

    const storeATimers = await Timer.find({ shop: "store-a.myshopify.com" });
    const storeBTimers = await Timer.find({ shop: "store-b.myshopify.com" });

    expect(storeATimers).toHaveLength(1);
    expect(storeATimers[0].title).toBe("Store A Timer");
    expect(storeBTimers).toHaveLength(1);
    expect(storeBTimers[0].title).toBe("Store B Timer");
  });

  // Test 9: Default style values
  it("should apply default style values", async () => {
    const timer = await Timer.create({
      shop: "test-store.myshopify.com",
      title: "Default Style Timer",
      timerType: "evergreen",
      evergreenDuration: 60,
    });

    expect(timer.style.backgroundColor).toBe("#000000");
    expect(timer.style.textColor).toBe("#FFFFFF");
    expect(timer.style.accentColor).toBe("#FF6B35");
    expect(timer.style.position).toBe("below_price");
    expect(timer.style.showLabels).toBe(true);
  });

  // Test 10: Impression increment
  it("should increment impressions correctly", async () => {
    const timer = await Timer.create({
      shop: "test-store.myshopify.com",
      title: "Impression Test",
      timerType: "evergreen",
      evergreenDuration: 60,
    });

    await Timer.findByIdAndUpdate(timer._id, { $inc: { impressions: 1 } });
    await Timer.findByIdAndUpdate(timer._id, { $inc: { impressions: 1 } });
    await Timer.findByIdAndUpdate(timer._id, { $inc: { impressions: 1 } });

    const updated = await Timer.findById(timer._id);
    expect(updated.impressions).toBe(3);
  });
});
