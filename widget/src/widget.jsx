import { h, render } from "preact";
import { App } from "./components/App";

/**
 * Entry point — finds the container injected by the Liquid block
 * and mounts the Preact app tree into it.
 */
function init() {
  var container = document.getElementById("helixo-countdown-timer");
  if (!container) return;

  var shop = container.dataset.shop;
  var productId = container.dataset.productId;
  var collectionIds = container.dataset.collectionIds;

  render(
    h(App, { shop: shop, productId: productId, collectionIds: collectionIds }),
    container
  );
}

// With defer the DOM is ready, but guard against edge cases
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
