import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { Timer } from "./Timer";
import { fetchTimers, trackImpression } from "../utils/api";
import { positionWidget } from "../utils/position";

/**
 * Root component — fetches active timers for the current product page,
 * handles API failure gracefully, and renders all matching timers.
 */
export function App({ shop, productId, collectionIds }) {
  var _s = useState(null);
  var timers = _s[0], setTimers = _s[1];
  var _e = useState(false);
  var loaded = _e[0], setLoaded = _e[1];

  useEffect(
    function () {
      fetchTimers(shop, productId, collectionIds)
        .then(function (data) {
          if (data && data.success && data.timers && data.timers.length > 0) {
            setTimers(data.timers);
            // Track impression for each timer (deduped internally)
            data.timers.forEach(function (t) {
              trackImpression(t.id, shop);
            });
          }
          setLoaded(true);
        })
        .catch(function () {
          setLoaded(true); // Fail silently — never break the storefront
        });
    },
    [shop, productId, collectionIds]
  );

  // Attempt DOM-based positioning once timers are loaded
  useEffect(
    function () {
      if (timers && timers.length > 0) {
        positionWidget(
          document.getElementById("helixo-countdown-timer"),
          timers[0].style.position
        );
      }
    },
    [timers]
  );

  // Nothing to show — remain invisible (no CLS)
  if (!loaded || !timers || timers.length === 0) return null;

  return h(
    "div",
    { class: "helixo-timers-list" },
    timers.map(function (timer) {
      return h(Timer, { key: timer.id, timer: timer });
    })
  );
}
