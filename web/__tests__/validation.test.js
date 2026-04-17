import { describe, it, expect } from "vitest";
import {
  createTimerSchema,
  updateTimerSchema,
  storefrontQuerySchema,
  impressionSchema,
} from "../middleware/validate.js";

describe("Joi Validation — createTimerSchema", () => {
  const validFixed = {
    title: "Summer Sale",
    timerType: "fixed",
    startDate: "2026-06-01T00:00:00.000Z",
    endDate: "2026-06-30T00:00:00.000Z",
  };

  const validEvergreen = {
    title: "Flash Deal",
    timerType: "evergreen",
    evergreenDuration: 60,
  };

  it("should accept a valid fixed timer", () => {
    const { error } = createTimerSchema.validate(validFixed);
    expect(error).toBeUndefined();
  });

  it("should accept a valid evergreen timer", () => {
    const { error } = createTimerSchema.validate(validEvergreen);
    expect(error).toBeUndefined();
  });

  it("should reject missing title", () => {
    const { error } = createTimerSchema.validate({ timerType: "fixed", startDate: "2026-06-01T00:00:00Z", endDate: "2026-06-30T00:00:00Z" });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("title");
  });

  it("should reject title exceeding 200 characters", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      title: "A".repeat(201),
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain("200");
  });

  it("should reject invalid timerType", () => {
    const { error } = createTimerSchema.validate({
      title: "Bad",
      timerType: "invalid",
    });
    expect(error).toBeDefined();
    expect(error.details[0].path).toContain("timerType");
  });

  it("should require startDate for fixed timers", () => {
    const { error } = createTimerSchema.validate({
      title: "No Start",
      timerType: "fixed",
      endDate: "2026-06-30T00:00:00Z",
    });
    expect(error).toBeDefined();
    expect(error.details.some((d) => d.path.includes("startDate"))).toBe(true);
  });

  it("should reject endDate before startDate", () => {
    const { error } = createTimerSchema.validate({
      title: "Backwards",
      timerType: "fixed",
      startDate: "2026-06-30T00:00:00Z",
      endDate: "2026-06-01T00:00:00Z",
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain("after");
  });

  it("should require evergreenDuration for evergreen timers", () => {
    const { error } = createTimerSchema.validate({
      title: "No Duration",
      timerType: "evergreen",
    });
    expect(error).toBeDefined();
    expect(error.details.some((d) => d.path.includes("evergreenDuration"))).toBe(true);
  });

  it("should reject evergreenDuration outside range (0)", () => {
    const { error } = createTimerSchema.validate({
      ...validEvergreen,
      evergreenDuration: 0,
    });
    expect(error).toBeDefined();
  });

  it("should reject evergreenDuration outside range (10081)", () => {
    const { error } = createTimerSchema.validate({
      ...validEvergreen,
      evergreenDuration: 10081,
    });
    expect(error).toBeDefined();
  });

  it("should accept valid product GIDs", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      targetType: "specific_products",
      targetProductIds: ["gid://shopify/Product/123", "gid://shopify/Product/456"],
    });
    expect(error).toBeUndefined();
  });

  it("should reject invalid product GIDs", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      targetType: "specific_products",
      targetProductIds: ["not-a-gid"],
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain("product GID");
  });

  it("should reject empty product array when targeting specific products", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      targetType: "specific_products",
      targetProductIds: [],
    });
    expect(error).toBeDefined();
  });

  it("should accept valid collection GIDs", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      targetType: "specific_collections",
      targetCollectionIds: ["gid://shopify/Collection/10"],
    });
    expect(error).toBeUndefined();
  });

  it("should reject invalid hex color", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      style: { backgroundColor: "red" },
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain("background color");
  });

  it("should accept valid hex colors", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      style: { backgroundColor: "#FF0000", textColor: "#00FF00", accentColor: "#0000FF" },
    });
    expect(error).toBeUndefined();
  });

  it("should reject invalid position value", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      style: { position: "floating" },
    });
    expect(error).toBeDefined();
  });

  it("should reject invalid size value", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      style: { size: "huge" },
    });
    expect(error).toBeDefined();
  });

  it("should reject invalid urgency effect", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      style: { urgencyEffect: "explode" },
    });
    expect(error).toBeDefined();
  });

  it("should strip unknown fields", () => {
    const { value } = createTimerSchema.validate(
      { ...validFixed, hackField: "evil" },
      { stripUnknown: true }
    );
    expect(value.hackField).toBeUndefined();
  });

  it("should default isActive to true", () => {
    const { value } = createTimerSchema.validate(validFixed);
    expect(value.isActive).toBe(true);
  });

  it("should default targetType to all", () => {
    const { value } = createTimerSchema.validate(validFixed);
    expect(value.targetType).toBe("all");
  });

  it("should accept description up to 500 chars", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      description: "X".repeat(500),
    });
    expect(error).toBeUndefined();
  });

  it("should reject description over 500 chars", () => {
    const { error } = createTimerSchema.validate({
      ...validFixed,
      description: "X".repeat(501),
    });
    expect(error).toBeDefined();
  });
});

describe("Joi Validation — updateTimerSchema", () => {
  it("should allow partial updates (title optional)", () => {
    const { error } = updateTimerSchema.validate({
      description: "Updated description",
    });
    expect(error).toBeUndefined();
  });

  it("should still validate fields when provided", () => {
    const { error } = updateTimerSchema.validate({
      title: "A".repeat(201),
    });
    expect(error).toBeDefined();
  });
});

describe("Joi Validation — storefrontQuerySchema", () => {
  it("should accept valid shop domain", () => {
    const { error } = storefrontQuerySchema.validate({
      shop: "my-store.myshopify.com",
    });
    expect(error).toBeUndefined();
  });

  it("should reject missing shop", () => {
    const { error } = storefrontQuerySchema.validate({});
    expect(error).toBeDefined();
  });

  it("should reject invalid shop domain", () => {
    const { error } = storefrontQuerySchema.validate({ shop: "evil.com" });
    expect(error).toBeDefined();
    expect(error.details[0].message).toContain("shop domain");
  });

  it("should accept optional productId and collectionIds", () => {
    const { error } = storefrontQuerySchema.validate({
      shop: "test.myshopify.com",
      productId: "gid://shopify/Product/123",
      collectionIds: "gid://shopify/Collection/1,gid://shopify/Collection/2",
    });
    expect(error).toBeUndefined();
  });
});

describe("Joi Validation — impressionSchema", () => {
  it("should accept valid impression body", () => {
    const { error } = impressionSchema.validate({
      timerId: "507f1f77bcf86cd799439011",
      shop: "test.myshopify.com",
    });
    expect(error).toBeUndefined();
  });

  it("should reject missing timerId", () => {
    const { error } = impressionSchema.validate({
      shop: "test.myshopify.com",
    });
    expect(error).toBeDefined();
  });

  it("should reject missing shop", () => {
    const { error } = impressionSchema.validate({
      timerId: "507f1f77bcf86cd799439011",
    });
    expect(error).toBeDefined();
  });

  it("should reject invalid shop in impression", () => {
    const { error } = impressionSchema.validate({
      timerId: "507f1f77bcf86cd799439011",
      shop: "evil.com",
    });
    expect(error).toBeDefined();
  });
});
