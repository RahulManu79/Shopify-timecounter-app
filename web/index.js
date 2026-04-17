// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import compression from "compression";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import connectToDatabase from "./database/connection.js";
import timerRoutes from "./routes/timers.js";
import storefrontRoutes from "./routes/storefront.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { RATE_LIMIT } from "./constants/index.js";

// Load environment variables
dotenv.config();

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

// Enable gzip/brotli compression for all responses
app.use(compression());

// Connect to MongoDB
await connectToDatabase();

// Rate limiter for storefront API (public endpoints)
const storefrontLimiter = rateLimit({
  windowMs: RATE_LIMIT.STOREFRONT_WINDOW_MS,
  max: RATE_LIMIT.STOREFRONT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later" },
});

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// CORS for storefront API — restrict to Shopify store domains
app.use("/api/storefront", (req, res, next) => {
  const origin = req.headers.origin || "";
  // Allow *.myshopify.com and Shopify admin domains
  if (
    /^https:\/\/[a-zA-Z0-9-]+\.myshopify\.com$/.test(origin) ||
    /^https:\/\/admin\.shopify\.com$/.test(origin)
  ) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Vary", "Origin");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Public storefront API (no Shopify auth, rate limited)
app.use(express.json());
app.use("/api/storefront", storefrontLimiter, storefrontRoutes);

// Authenticated admin API routes
app.use("/api/*", shopify.validateAuthenticatedSession());

// Timer CRUD routes (authenticated)
app.use("/api/timers", timerRoutes);

// Keep the original products routes
app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (/** @type {any} */ e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

// Centralized error handler for API routes
app.use(errorHandler);

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

// Cache index.html in memory — avoids readFileSync on every request
let cachedIndexHtml = null;
function getIndexHtml() {
  if (!cachedIndexHtml) {
    cachedIndexHtml = readFileSync(join(STATIC_PATH, "index.html"))
      .toString()
      .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "");
  }
  return cachedIndexHtml;
}

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(getIndexHtml());
});

const server = app.listen(PORT);

// Graceful shutdown — drain connections and close DB on termination
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      const mongoose = await import("mongoose");
      await mongoose.default.connection.close();
      console.log("MongoDB connection closed.");
    } catch (err) {
      console.error("Error during shutdown:", err.message);
    }
    process.exit(0);
  });

  // Force exit after 10s if connections won't drain
  setTimeout(() => {
    console.error("Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
