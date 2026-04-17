// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import compression from "compression";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

import shopify from "./shopify.js";
import connectToDatabase from "./database/connection.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { storefrontCors } from "./middleware/cors.js";
import { RATE_LIMIT } from "./constants/index.js";

// Route modules
import authRoutes from "./routes/auth.js";
import timerRoutes from "./routes/timers.js";
import productRoutes from "./routes/products.js";
import storefrontRoutes from "./routes/storefront.js";

// ── Bootstrap ──

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

// Global middleware
app.use(compression());
app.use(express.json());

// Connect to MongoDB (retries with exponential backoff)
await connectToDatabase();

// ── Route mounting ──

// Shopify auth & webhooks (unauthenticated)
app.use(authRoutes);

// Storefront API (public, CORS-restricted, rate-limited)
const storefrontLimiter = rateLimit({
  windowMs: RATE_LIMIT.STOREFRONT_WINDOW_MS,
  max: RATE_LIMIT.STOREFRONT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later" },
});
app.use("/api/storefront", storefrontCors, storefrontLimiter, storefrontRoutes);

// All remaining /api/* routes require Shopify session
app.use("/api/*", shopify.validateAuthenticatedSession());

// Authenticated admin routes
app.use("/api/timers", timerRoutes);
app.use("/api/products", productRoutes);

// Centralized error handler
app.use(errorHandler);

// ── Static / SPA fallback ──

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

/**
 * @type {string | null}
 */
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

// ── Start server ──

const server = app.listen(PORT);

// Graceful shutdown — drain connections and close DB on termination
/**
 * @param {string} signal
 */
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    } catch (err) {
      // @ts-ignore
      console.error("Error during shutdown:", err.message);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
