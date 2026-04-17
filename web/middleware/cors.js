/**
 * CORS middleware for storefront API.
 * Restricts Access-Control-Allow-Origin to Shopify store domains only.
 */
export function storefrontCors(req, res, next) {
  const origin = req.headers.origin || "";

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
}
