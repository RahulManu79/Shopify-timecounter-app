import { useState, useEffect } from "preact/hooks";

/**
 * Hook that returns the milliseconds remaining until `endTime`.
 * Updates every second via setInterval. Returns 0 when expired.
 */
export function useCountdown(endTime) {
  var _s = useState(function () {
    return Math.max(0, endTime - Date.now());
  });
  var remaining = _s[0], setRemaining = _s[1];

  useEffect(
    function () {
      if (endTime <= Date.now()) {
        setRemaining(0);
        return;
      }

      function tick() {
        var r = endTime - Date.now();
        if (r <= 0) {
          setRemaining(0);
          clearInterval(id);
        } else {
          setRemaining(r);
        }
      }

      var id = setInterval(tick, 1000);
      return function () {
        clearInterval(id);
      };
    },
    [endTime]
  );

  return remaining;
}
