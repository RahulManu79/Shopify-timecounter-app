import crypto from "crypto";

/**
 * Verify Shopify App Proxy HMAC signature.
 * Shopify signs app proxy requests with the app's secret key.
 * See: https://shopify.dev/docs/apps/online-store/app-proxies#calculate-a-digital-signature
 */
export function verifyAppProxyHmac(req, res, next) {
  const { signature, ...params } = req.query;

  // In development mode without a proxy, skip HMAC check
  if (!signature) {
    if (process.env.NODE_ENV === "development") {
      return next();
    }
    return res.status(401).json({ success: false, error: "Missing signature" });
  }

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    console.error("SHOPIFY_API_SECRET not set — cannot verify HMAC");
    return res.status(500).json({ success: false, error: "Server configuration error" });
  }

  // Sort params alphabetically and build the message string
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => {
      const value = Array.isArray(params[key])
        ? params[key].join(",")
        : params[key];
      return `${key}=${value}`;
    })
    .join("");

  const computed = crypto
    .createHmac("sha256", secret)
    .update(sortedParams)
    .digest("hex");

  if (
    computed.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
  ) {
    return next();
  }

  return res.status(401).json({ success: false, error: "Invalid signature" });
}
