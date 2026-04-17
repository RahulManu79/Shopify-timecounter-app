/**
 * Attempt to move the widget container to the correct position on the
 * product page based on the merchant's `style.position` setting.
 *
 * This uses common Shopify theme selectors. If the target anchor element
 * cannot be found, the widget stays where the merchant placed the block
 * in the theme editor — a safe, no-op fallback.
 */

var SELECTORS = {
  above_title: [
    ".product__title",
    "h1.product-single__title",
    ".product-title",
    "h1[data-product-title]",
    ".product-info h1",
  ],
  below_title: [
    ".product__title",
    "h1.product-single__title",
    ".product-title",
    "h1[data-product-title]",
    ".product-info h1",
  ],
  below_price: [
    ".product__price",
    ".price",
    "[data-product-price]",
    ".product-price",
    ".product-single__price",
  ],
  below_add_to_cart: [
    "form[action*='/cart/add']",
    ".product-form",
    ".product-form__buttons",
    "[data-add-to-cart-form]",
    ".product__submit",
  ],
};

function findAnchor(position) {
  var candidates = SELECTORS[position];
  if (!candidates) return null;

  for (var i = 0; i < candidates.length; i++) {
    var el = document.querySelector(candidates[i]);
    if (el) return el;
  }
  return null;
}

export function positionWidget(container, position) {
  if (!container || !position) return;

  var anchor = findAnchor(position);
  if (!anchor) return; // Fallback: stay in place

  if (position === "above_title") {
    anchor.parentNode.insertBefore(container, anchor);
  } else {
    // below_title, below_price, below_add_to_cart — insert after the anchor
    anchor.parentNode.insertBefore(container, anchor.nextSibling);
  }
}
