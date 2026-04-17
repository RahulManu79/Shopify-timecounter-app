import { DeliveryMethod } from "@shopify/shopify-api";
import timerService from "./services/timerService.js";

/**
 * @type {{[key: string]: import("@shopify/shopify-api").WebhookHandler}}
 */
export default {
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, _shop, _body, _webhookId) => {
      // This app does not store customer-specific data.
      // No action required.
    },
  },

  CUSTOMERS_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, _shop, _body, _webhookId) => {
      // This app does not store customer-specific data.
      // No action required.
    },
  },

  SHOP_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, _shop, body, _webhookId) => {
      const payload = JSON.parse(body);
      const shopDomain = payload.shop_domain;
      try {
        const result = await timerService.deleteAllByShop(shopDomain);
        console.log(
          `[SHOP_REDACT] Deleted ${result.deletedCount} timers for ${shopDomain}`
        );
      } catch (error) {
        console.error(
          `[SHOP_REDACT] Failed to delete timers for ${shopDomain}:`,
          error.message
        );
      }
    },
  },
};
