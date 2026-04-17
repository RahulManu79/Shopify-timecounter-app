import Joi from "joi";
import mongoose from "mongoose";
import {
  TIMER_TYPE_VALUES,
  TARGET_TYPE_VALUES,
  POSITION_VALUES,
  SIZE_VALUES,
  URGENCY_EFFECT_VALUES,
  LIMITS,
  PATTERNS,
  HTTP,
} from "../constants/index.js";

// ── Joi Schemas ──

const styleSchema = Joi.object({
  backgroundColor: Joi.string().pattern(PATTERNS.HEX_COLOR).messages({
    "string.pattern.base": "Invalid background color format",
  }),
  textColor: Joi.string().pattern(PATTERNS.HEX_COLOR).messages({
    "string.pattern.base": "Invalid text color format",
  }),
  accentColor: Joi.string().pattern(PATTERNS.HEX_COLOR).messages({
    "string.pattern.base": "Invalid accent color format",
  }),
  position: Joi.string().valid(...POSITION_VALUES),
  size: Joi.string().valid(...SIZE_VALUES),
  urgencyEffect: Joi.string().valid(...URGENCY_EFFECT_VALUES),
  displayText: Joi.string().max(LIMITS.DISPLAY_TEXT_MAX).allow(""),
  urgencyThresholdMinutes: Joi.number()
    .integer()
    .min(LIMITS.URGENCY_THRESHOLD_MIN),
  showLabels: Joi.boolean(),
}).default({});

export const createTimerSchema = Joi.object({
  title: Joi.string().trim().max(LIMITS.TITLE_MAX).required().messages({
    "string.empty": "Title is required",
    "string.max": `Title must be under ${LIMITS.TITLE_MAX} characters`,
    "any.required": "Title is required",
  }),
  description: Joi.string()
    .trim()
    .max(LIMITS.DESCRIPTION_MAX)
    .allow("")
    .default(""),
  timerType: Joi.string()
    .valid(...TIMER_TYPE_VALUES)
    .required()
    .messages({
      "any.only": "Timer type must be fixed or evergreen",
      "any.required": "Timer type is required",
    }),
  startDate: Joi.when("timerType", {
    is: "fixed",
    then: Joi.date().iso().required().messages({
      "date.format": "Invalid start date format",
      "any.required": "Start date is required for fixed timers",
    }),
    otherwise: Joi.any().strip(),
  }),
  endDate: Joi.when("timerType", {
    is: "fixed",
    then: Joi.date().iso().greater(Joi.ref("startDate")).required().messages({
      "date.format": "Invalid end date format",
      "date.greater": "End date must be after start date",
      "any.required": "End date is required for fixed timers",
    }),
    otherwise: Joi.any().strip(),
  }),
  evergreenDuration: Joi.when("timerType", {
    is: "evergreen",
    then: Joi.number()
      .integer()
      .min(LIMITS.DURATION_MIN)
      .max(LIMITS.DURATION_MAX)
      .required()
      .messages({
        "number.min": `Duration must be at least ${LIMITS.DURATION_MIN} minute`,
        "number.max": `Duration must be at most ${LIMITS.DURATION_MAX} minutes`,
        "any.required": "Duration is required for evergreen timers",
      }),
    otherwise: Joi.any().strip(),
  }),
  targetType: Joi.string()
    .valid(...TARGET_TYPE_VALUES)
    .default("all"),
  targetProductIds: Joi.when("targetType", {
    is: "specific_products",
    then: Joi.array()
      .items(
        Joi.string().pattern(PATTERNS.PRODUCT_GID).messages({
          "string.pattern.base": "Invalid product GID format",
        })
      )
      .min(1)
      .required()
      .messages({
        "array.min": "At least one product must be selected",
      }),
    otherwise: Joi.array().items(Joi.string()).default([]),
  }),
  targetCollectionIds: Joi.when("targetType", {
    is: "specific_collections",
    then: Joi.array()
      .items(
        Joi.string().pattern(PATTERNS.COLLECTION_GID).messages({
          "string.pattern.base": "Invalid collection GID format",
        })
      )
      .min(1)
      .required()
      .messages({
        "array.min": "At least one collection must be selected",
      }),
    otherwise: Joi.array().items(Joi.string()).default([]),
  }),
  style: styleSchema,
  isActive: Joi.boolean().default(true),
});

export const updateTimerSchema = createTimerSchema.fork(
  ["title", "timerType"],
  (schema) => schema.optional()
);

export const storefrontQuerySchema = Joi.object({
  shop: Joi.string()
    .pattern(PATTERNS.SHOP_DOMAIN)
    .required()
    .messages({
      "string.pattern.base": "Invalid shop domain",
      "any.required": "Shop is required",
    }),
  productId: Joi.string().allow("").optional(),
  collectionIds: Joi.string().allow("").optional(),
  // Allow Shopify App Proxy params to pass through
  signature: Joi.string().optional(),
  path_prefix: Joi.string().optional(),
  timestamp: Joi.string().optional(),
  logged_in_customer_id: Joi.string().allow("").optional(),
}).options({ allowUnknown: true });

export const impressionSchema = Joi.object({
  timerId: Joi.string().required().messages({
    "any.required": "Timer ID is required",
  }),
  shop: Joi.string().pattern(PATTERNS.SHOP_DOMAIN).required().messages({
    "string.pattern.base": "Invalid shop domain",
    "any.required": "Shop is required",
  }),
});

// ── Middleware Factory ──

export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message.replace(/"/g, ""),
      }));
      return res.status(HTTP.BAD_REQUEST).json({ success: false, errors });
    }

    req.body = value;
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: false,
    });

    if (error) {
      const message = error.details.map((d) => d.message.replace(/"/g, "")).join("; ");
      return res.status(HTTP.BAD_REQUEST).json({ success: false, error: message });
    }

    req.query = value;
    next();
  };
}

export function validateObjectId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res
      .status(HTTP.BAD_REQUEST)
      .json({ success: false, error: "Invalid timer ID" });
  }
  next();
}
