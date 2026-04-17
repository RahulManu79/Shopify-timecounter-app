import { Router } from "express";
import shopify from "../shopify.js";
import PrivacyWebhookHandlers from "../privacy.js";

const router = Router();

// Shopify OAuth flow
router.get(shopify.config.auth.path, shopify.auth.begin());
router.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);

// Shopify webhook handler (GDPR endpoints: customers/shop data requests)
router.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

export default router;
