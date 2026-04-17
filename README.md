# Helixo Countdown Timer — Shopify App

A Shopify app that allows merchants to add customizable countdown timers to product pages, creating urgency for promotions and boosting conversions.

## Features

- **Fixed Timers**: Set specific start/end dates — all visitors see the same countdown
- **Evergreen Timers**: Session-based timers that start when a visitor arrives (stored in localStorage), reset after expiry
- **Product/Collection Targeting**: Apply timers to all products, specific products, or specific collections using Shopify Resource Picker
- **Full Customization**: Background color, text color, accent color, position, size, display text, urgency effects
- **Visual Urgency Cues**: Configurable animations (pulse, flash, shake) with adjustable threshold
- **Position Control**: Timer placement (above title, below title, below price, below add-to-cart) via DOM positioning with theme-aware fallback
- **Multiple Timer Support**: All matching timers render on a product page, not just the first
- **Analytics Dashboard**: Impression tracking per timer with summary stats, rankings, and progress bars
- **Live Preview**: See timer styling and urgency animations in real-time while editing

## Architecture Decisions

### Tech Stack
- **Backend**: Node.js + Express (Shopify CLI node-express template)
- **Frontend Admin**: React 18 + Shopify Polaris + React Query + Vite
- **Database**: MongoDB Atlas (multi-tenant, compound-indexed by shop domain)
- **Storefront Widget**: Preact, bundled with esbuild (16.7 KB raw, 6.8 KB gzipped)
- **Theme Integration**: Shopify Theme App Extension (Liquid block + compiled JS asset)
- **Session Storage**: SQLite (Shopify default for session tokens)
- **Testing**: Vitest + MongoDB Memory Server + Supertest + @testing-library/react

### Why These Choices

1. **Theme App Extension over ScriptTag**: Theme extensions are the modern Shopify approach — they survive app uninstalls, work with Online Store 2.0 themes, and don't require theme code injection. Merchants can position the block in the theme editor.

2. **MongoDB over SQL**: Timer configs are document-shaped (nested style objects, variable-length arrays for targeting). MongoDB's flexible schema fits naturally. Multi-tenant isolation is enforced via `shop` field on every query.

3. **Preact for the storefront widget**: The widget uses Preact (~4KB) for a component-based architecture with hooks (`useCountdown`), while keeping the total bundle at 6.8 KB gzipped — well under the 30 KB target. esbuild handles bundling with tree-shaking and minification. The build enforces a hard 30 KB gzip limit.

4. **Separate storefront API**: The `/api/storefront/*` endpoints are public (no Shopify session auth) but secured with Shopify App Proxy HMAC verification, rate-limited (120 req/min/IP), and validated via Joi schemas.

5. **`Cache-Control` headers**: Storefront timer responses are cached for 60 seconds (`public, max-age=60, s-maxage=60`), reducing DB load while keeping timers reasonably fresh.

6. **Service layer pattern**: Business logic lives in `TimerService` (not controllers), making it testable independently of Express. Controllers only handle HTTP concerns.

### Project Structure

```
helixo-dev/
├── web/                          # Backend + Admin frontend
│   ├── index.js                  # Express server entry point
│   ├── models/Timer.js           # Mongoose schema with virtuals
│   ├── services/timerService.js  # Business logic (CRUD + storefront)
│   ├── controllers/              # HTTP handlers (admin + storefront)
│   ├── routes/                   # Route definitions with validation
│   ├── middleware/                # Error handler, Joi validation, HMAC
│   ├── constants/index.js        # Enums, limits, patterns, defaults
│   ├── database/connection.js    # MongoDB connection (singleton)
│   ├── __tests__/                # Backend tests (102 tests)
│   └── frontend/                 # React admin app
│       ├── pages/index.jsx       # Dashboard (timers list + analytics)
│       ├── components/TimerForm.jsx  # Create/edit form with preview
│       ├── hooks/                # useAuthenticatedFetch
│       └── __tests__/            # Frontend component tests (9 tests)
├── widget/                       # Preact storefront widget source
│   ├── src/
│   │   ├── widget.jsx            # Entry point (mounts Preact)
│   │   ├── components/App.jsx    # Root (fetch, render all timers)
│   │   ├── components/Timer.jsx  # Single timer display
│   │   ├── hooks/useCountdown.js # Countdown hook (1s interval)
│   │   └── utils/                # API, evergreen, DOM positioning
│   ├── esbuild.config.mjs        # Build + size check (30KB limit)
│   └── package.json              # preact + esbuild
├── extensions/countdown-timer/   # Shopify Theme App Extension
│   ├── assets/countdown-widget.js  # Built Preact bundle
│   ├── blocks/countdown_timer.liquid  # Liquid block + CSS
│   └── locales/
├── shopify.app.toml              # Shopify app config
├── Dockerfile                    # Production container
└── package.json                  # Monorepo workspaces + scripts
```

### Data Architecture

```
Timer {
  shop: String (indexed)            // Multi-tenant isolation
  title: String
  timerType: "fixed" | "evergreen"
  startDate/endDate: Date           // For fixed timers
  evergreenDuration: Number         // Minutes, for evergreen timers
  targetType: "all" | "specific_products" | "specific_collections"
  targetProductIds: [String]        // Shopify GID format
  targetCollectionIds: [String]     // Shopify GID format
  style: {
    backgroundColor, textColor, accentColor,
    position, size, urgencyEffect,
    displayText, urgencyThresholdMinutes, showLabels
  }
  isActive: Boolean
  impressions: Number               // Analytics counter (atomic $inc)
  createdAt/updatedAt               // Auto-managed timestamps
}
```

Compound indexes: `{ shop, isActive }` and `{ shop, targetType }` for efficient storefront queries.

Virtual field `status` computes: "active" | "scheduled" | "expired" | "inactive" based on current time and `isActive` flag.

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm 8+
- Shopify CLI 3.x (`npm install -g @shopify/cli@latest`)
- MongoDB Atlas account (free tier works)
- Shopify Partners account with a development store

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd helixo-dev

# 2. Install all dependencies (workspaces handle web, frontend, widget)
npm install

# 3. Configure environment
# Create web/.env with your MongoDB connection string:
echo "MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/helixo-timers?retryWrites=true&w=majority" > web/.env

# 4. Build the storefront widget (outputs to extensions/countdown-timer/assets/)
npm run build:widget

# 5. Run the app
shopify app dev
```

The CLI will prompt you to select a dev store and open the app in your browser.

### Running Tests

```bash
# Backend tests (102 tests: model, service, validation, error handler, constants, API integration)
cd web && npm test

# Frontend component tests (9 tests: TimerForm rendering, validation, submission, edit mode)
cd web/frontend && npm test

# Check widget bundle size (fails if >30KB gzipped)
npm run size-check
```

### Building the Widget

```bash
# One-time build
npm run build:widget

# Watch mode for development
npm run dev:widget
```

### Linting

```bash
cd web && npm run lint
```

## API Documentation

All admin endpoints require Shopify session authentication (handled automatically by the app).

### Admin API (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/timers` | List all timers for the current shop |
| `GET` | `/api/timers/:id` | Get a single timer by ID |
| `POST` | `/api/timers` | Create a new timer |
| `PUT` | `/api/timers/:id` | Update an existing timer |
| `DELETE` | `/api/timers/:id` | Delete a timer |
| `POST` | `/api/timers/:id/toggle` | Toggle timer active/inactive |

### Storefront API (Public, HMAC-Verified, Rate-Limited)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/storefront/timers?shop=X&productId=Y&collectionIds=Z` | Get active timers matching a product |
| `POST` | `/api/storefront/impression` | Track a timer impression |

Storefront endpoints are secured by:

- **HMAC signature verification** (Shopify App Proxy signs requests with the app secret, verified via `crypto.timingSafeEqual`)
- **Rate limiting**: 120 requests per minute per IP via `express-rate-limit`
- **Input validation**: Joi schemas validate shop domain, productId, and collectionIds

Admin endpoints are protected by Shopify's session authentication middleware.

### Input Validation

All timer creation/update requests are validated using Joi:

- Title: required, max 200 chars, trimmed
- Timer type: must be "fixed" or "evergreen"
- Dates: ISO 8601 format, end date must be after start date
- Duration: 1–10080 minutes (1 min to 7 days)
- Target IDs: validated against Shopify GID regex (`gid://shopify/Product/\d+`)
- Colors: hex format (`#XXXXXX`)
- Shop domain: validated against `*.myshopify.com` pattern
- Unknown fields are stripped automatically (`stripUnknown: true`)

### Error Response Format

```json
{
  "success": false,
  "errors": [
    { "field": "title", "message": "Title is required" }
  ]
}
```

## Performance Optimizations

1. **Widget bundle**: 6.8 KB gzipped (Preact + esbuild tree-shaking + minification) — enforced <30 KB limit in build
2. **No CLS**: Timer container uses `display:none` until Preact mounts content, then appears via CSS `:not(:empty)` rule
3. **Deferred loading**: Widget script uses `defer` attribute — non-blocking, loads after DOM is parsed
4. **Caching**: 60-second `Cache-Control` on storefront API responses
5. **Efficient queries**: MongoDB compound indexes on `{ shop, isActive }` and `{ shop, targetType }`
6. **Minimal payload**: Storefront API returns only widget-needed fields (id, type, endDate/duration, style) via `.select().lean()`
7. **Tabular nums**: Timer digits use `font-variant-numeric: tabular-nums` to prevent width jitter during countdown
8. **Compression**: Express `compression` middleware enables gzip/brotli for all responses
9. **Impression deduplication**: localStorage-based 30-minute window prevents duplicate impression counts per visitor
10. **Atomic counters**: Impression tracking uses MongoDB `$inc` operator (no read-modify-write race conditions)
11. **Graceful shutdown**: SIGTERM/SIGINT handlers drain connections and close MongoDB before exit

## Security

- **Shopify session auth** on all admin API calls (validated by `@shopify/shopify-app-express`)
- **HMAC signature verification** on storefront API (App Proxy requests signed by Shopify)
- **Multi-tenant isolation**: Every DB query filters by `shop` field — no cross-shop data access
- **Input sanitization**: Joi schemas with `stripUnknown` prevent mass-assignment and validate all fields
- **Rate limiting**: 120 req/min/IP on public storefront endpoints
- **Timing-safe comparison**: HMAC verification uses `crypto.timingSafeEqual` to prevent timing attacks
- **CORS restriction**: Storefront CORS only allows `*.myshopify.com` and `admin.shopify.com` origins
- **No sensitive data exposure**: API keys injected from env vars at runtime, `.env` excluded from git
- **Centralized error handling**: Unexpected errors return generic messages, stack traces never leak to client

## Test Coverage

| Suite | File | Tests | Covers |
| ------- | ------ | ------- | -------- |
| Timer Model | `timer-model.test.js` | 10 | Schema validation, virtuals, indexes, multi-tenant |
| Timer Service | `timerService.test.js` | 18 | CRUD, storefront queries, targeting, impressions |
| Validation | `validation.test.js` | 32 | Joi schemas for all inputs, edge cases, stripping |
| Error Handler | `errorHandler.test.js` | 5 | Custom error classes, Mongoose errors, generic 500 |
| Constants | `constants.test.js` | 18 | Enums, regex patterns, limits, defaults |
| API Integration | `api.integration.test.js` | 18 | Full HTTP layer via Supertest (CRUD + storefront) |
| Frontend | `TimerForm.test.jsx` | 9 | Rendering, validation, submission, edit mode |
| **Total** | | **110** | |

## Assumptions

1. All matching timers are shown per product page (rendered by the Preact widget)
2. Evergreen timer state is stored in the visitor's `localStorage` — clearing browser data resets it
3. Impression tracking counts page loads per 30-minute window, not unique visitors
4. The widget fetches timer data on each page load (cached for 60s server-side)
5. Timer dates are stored in UTC; the countdown widget displays relative time remaining
6. Timer position uses DOM manipulation with common Shopify theme selectors; falls back to theme-editor placement if selectors don't match

## What I Would Improve With More Time

1. **Pagination**: Add limit/offset to the admin list endpoint for shops with many timers
2. **Richer analytics**: Click-through tracking, conversion attribution, time-series charts
3. **Bulk operations**: Select and delete/pause multiple timers at once
4. **A/B testing**: Compare timer styles and measure which converts better
5. **Scheduling queue**: Background job to auto-deactivate expired timers
6. **Webhook cleanup**: Listen for `APP_UNINSTALLED` to remove a shop's timers from MongoDB
7. **E2E tests**: Cypress/Playwright tests for the full admin flow
8. **Widget CDN**: Serve the compiled widget from a CDN edge for lower latency
