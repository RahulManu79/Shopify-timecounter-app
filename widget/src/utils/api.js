/**
 * API utilities for the storefront widget.
 * Uses the Shopify App Proxy (/apps/timer/*) which routes to our backend.
 */

var useProxy = true;

function getApiBase() {
  return useProxy ? "/apps/timer" : "";
}

/**
 * Fetch active timers for the current product page.
 * Falls back to direct tunnel fetch in dev mode if proxy returns 404.
 */
export function fetchTimers(shop, productId, collectionIds) {
  var url =
    getApiBase() + "/timers?shop=" + encodeURIComponent(shop);

  if (productId) {
    url += "&productId=gid://shopify/Product/" + productId;
  }
  if (collectionIds) {
    var ids = collectionIds
      .split(",")
      .map(function (id) {
        return "gid://shopify/Collection/" + id.trim();
      })
      .join(",");
    url += "&collectionIds=" + encodeURIComponent(ids);
  }

  return fetch(url)
    .then(function (res) {
      if (!res.ok && useProxy && res.status === 404) {
        // Proxy unavailable (dev mode) — try direct tunnel
        useProxy = false;
        return fetchTimers(shop, productId, collectionIds);
      }
      return res.json();
    })
    .catch(function () {
      return { success: false, timers: [] };
    });
}

/**
 * Track an impression for a timer.
 * Deduplicates per-visitor within a 30-minute window using localStorage.
 */
export function trackImpression(timerId, shop) {
  var storageKey = "helixo_imp_" + timerId;
  try {
    var lastTracked = localStorage.getItem(storageKey);
    if (lastTracked) {
      var elapsed = Date.now() - parseInt(lastTracked, 10);
      if (elapsed < 30 * 60 * 1000) return;
    }
    localStorage.setItem(storageKey, String(Date.now()));
  } catch (e) {
    // localStorage unavailable — allow the impression through
  }

  var url = useProxy
    ? "/apps/timer/impression"
    : "/api/storefront/impression";

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timerId: timerId, shop: shop }),
  }).catch(function () {});
}
