import { describe, it, expect } from "vitest";
import {
  TIMER_TYPE_VALUES,
  TARGET_TYPE_VALUES,
  POSITION_VALUES,
  SIZE_VALUES,
  URGENCY_EFFECT_VALUES,
  LIMITS,
  STYLE_DEFAULTS,
  PATTERNS,
  HTTP,
  UPDATABLE_FIELDS,
} from "../constants/index.js";

describe("Constants", () => {
  it("TIMER_TYPE_VALUES should contain fixed and evergreen", () => {
    expect(TIMER_TYPE_VALUES).toEqual(["fixed", "evergreen"]);
  });

  it("TARGET_TYPE_VALUES should contain all targeting options", () => {
    expect(TARGET_TYPE_VALUES).toContain("all");
    expect(TARGET_TYPE_VALUES).toContain("specific_products");
    expect(TARGET_TYPE_VALUES).toContain("specific_collections");
  });

  it("POSITION_VALUES should have 4 options", () => {
    expect(POSITION_VALUES).toHaveLength(4);
  });

  it("SIZE_VALUES should have small, medium, large", () => {
    expect(SIZE_VALUES).toEqual(["small", "medium", "large"]);
  });

  it("URGENCY_EFFECT_VALUES should include none", () => {
    expect(URGENCY_EFFECT_VALUES).toContain("none");
    expect(URGENCY_EFFECT_VALUES).toHaveLength(4);
  });

  it("LIMITS should have correct boundaries", () => {
    expect(LIMITS.TITLE_MAX).toBe(200);
    expect(LIMITS.DESCRIPTION_MAX).toBe(500);
    expect(LIMITS.DURATION_MIN).toBe(1);
    expect(LIMITS.DURATION_MAX).toBe(10080);
  });

  it("STYLE_DEFAULTS should have all required keys", () => {
    expect(STYLE_DEFAULTS).toHaveProperty("backgroundColor");
    expect(STYLE_DEFAULTS).toHaveProperty("textColor");
    expect(STYLE_DEFAULTS).toHaveProperty("accentColor");
    expect(STYLE_DEFAULTS).toHaveProperty("position");
    expect(STYLE_DEFAULTS).toHaveProperty("size");
    expect(STYLE_DEFAULTS).toHaveProperty("urgencyEffect");
    expect(STYLE_DEFAULTS).toHaveProperty("showLabels");
  });

  it("PATTERNS.SHOP_DOMAIN should validate correctly", () => {
    expect(PATTERNS.SHOP_DOMAIN.test("my-store.myshopify.com")).toBe(true);
    expect(PATTERNS.SHOP_DOMAIN.test("evil.com")).toBe(false);
    expect(PATTERNS.SHOP_DOMAIN.test("")).toBe(false);
    expect(PATTERNS.SHOP_DOMAIN.test("a.myshopify.com.evil.com")).toBe(false);
  });

  it("PATTERNS.PRODUCT_GID should validate GID format", () => {
    expect(PATTERNS.PRODUCT_GID.test("gid://shopify/Product/123")).toBe(true);
    expect(PATTERNS.PRODUCT_GID.test("gid://shopify/Product/")).toBe(false);
    expect(PATTERNS.PRODUCT_GID.test("123")).toBe(false);
    expect(PATTERNS.PRODUCT_GID.test("gid://shopify/Collection/123")).toBe(false);
  });

  it("PATTERNS.COLLECTION_GID should validate GID format", () => {
    expect(PATTERNS.COLLECTION_GID.test("gid://shopify/Collection/456")).toBe(true);
    expect(PATTERNS.COLLECTION_GID.test("gid://shopify/Product/456")).toBe(false);
  });

  it("PATTERNS.HEX_COLOR should validate hex colors", () => {
    expect(PATTERNS.HEX_COLOR.test("#FF0000")).toBe(true);
    expect(PATTERNS.HEX_COLOR.test("#abc123")).toBe(true);
    expect(PATTERNS.HEX_COLOR.test("red")).toBe(false);
    expect(PATTERNS.HEX_COLOR.test("#FFF")).toBe(false);
  });

  it("HTTP status codes should be correct", () => {
    expect(HTTP.OK).toBe(200);
    expect(HTTP.CREATED).toBe(201);
    expect(HTTP.BAD_REQUEST).toBe(400);
    expect(HTTP.NOT_FOUND).toBe(404);
    expect(HTTP.INTERNAL_SERVER_ERROR).toBe(500);
  });

  it("UPDATABLE_FIELDS should not include shop or impressions", () => {
    expect(UPDATABLE_FIELDS).not.toContain("shop");
    expect(UPDATABLE_FIELDS).not.toContain("impressions");
    expect(UPDATABLE_FIELDS).not.toContain("_id");
    expect(UPDATABLE_FIELDS).toContain("title");
    expect(UPDATABLE_FIELDS).toContain("style");
  });
});
