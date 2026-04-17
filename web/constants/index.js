// ── Timer Enums ──
export const TIMER_TYPES = {
  FIXED: "fixed",
  EVERGREEN: "evergreen",
};
export const TIMER_TYPE_VALUES = Object.values(TIMER_TYPES);

export const TARGET_TYPES = {
  ALL: "all",
  SPECIFIC_PRODUCTS: "specific_products",
  SPECIFIC_COLLECTIONS: "specific_collections",
};
export const TARGET_TYPE_VALUES = Object.values(TARGET_TYPES);

export const POSITIONS = {
  ABOVE_TITLE: "above_title",
  BELOW_TITLE: "below_title",
  BELOW_PRICE: "below_price",
  BELOW_ADD_TO_CART: "below_add_to_cart",
};
export const POSITION_VALUES = Object.values(POSITIONS);

export const SIZES = {
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large",
};
export const SIZE_VALUES = Object.values(SIZES);

export const URGENCY_EFFECTS = {
  NONE: "none",
  COLOR_PULSE: "color_pulse",
  FLASH: "flash",
  SHAKE: "shake",
};
export const URGENCY_EFFECT_VALUES = Object.values(URGENCY_EFFECTS);

// ── Limits ──
export const LIMITS = {
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 500,
  DISPLAY_TEXT_MAX: 100,
  DURATION_MIN: 1,
  DURATION_MAX: 10080, // 7 days in minutes
  URGENCY_THRESHOLD_MIN: 1,
};

// ── Style Defaults ──
export const STYLE_DEFAULTS = {
  backgroundColor: "#000000",
  textColor: "#FFFFFF",
  accentColor: "#FF6B35",
  position: POSITIONS.BELOW_PRICE,
  size: SIZES.MEDIUM,
  urgencyEffect: URGENCY_EFFECTS.COLOR_PULSE,
  displayText: "Sale ends in:",
  urgencyThresholdMinutes: 60,
  showLabels: true,
};

// ── Regex Patterns ──
export const PATTERNS = {
  HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
  SHOP_DOMAIN: /^[a-zA-Z0-9-]+\.myshopify\.com$/,
  PRODUCT_GID: /^gid:\/\/shopify\/Product\/\d+$/,
  COLLECTION_GID: /^gid:\/\/shopify\/Collection\/\d+$/,
  NUMERIC_SUFFIX: /(\d+)$/,
};

// ── Rate Limiting ──
export const RATE_LIMIT = {
  STOREFRONT_WINDOW_MS: 60 * 1000,
  STOREFRONT_MAX: 120,
};

// ── Cache ──
export const CACHE = {
  STOREFRONT_MAX_AGE: 60,
};

// ── Allowed update fields (whitelist) ──
export const UPDATABLE_FIELDS = [
  "title",
  "description",
  "timerType",
  "startDate",
  "endDate",
  "evergreenDuration",
  "targetType",
  "targetProductIds",
  "targetCollectionIds",
  "style",
  "isActive",
];

// ── HTTP Status Codes ──
export const HTTP = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};
