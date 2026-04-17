import { h, Fragment } from "preact";
import { useCountdown } from "../hooks/useCountdown";
import { getEndTime } from "../utils/evergreen";

/**
 * Single countdown timer component.
 * Supports both fixed (absolute end date) and evergreen (per-visitor) timers.
 * Applies urgency effects when remaining time drops below the threshold.
 */
export function Timer({ timer }) {
  var style = timer.style || {};
  var endTime = getEndTime(timer);
  var remaining = useCountdown(endTime);

  // Timer has expired — hide it, no layout shift
  if (remaining <= 0) return null;

  var days = Math.floor(remaining / 86400000);
  var hours = Math.floor((remaining % 86400000) / 3600000);
  var mins = Math.floor((remaining % 3600000) / 60000);
  var secs = Math.floor((remaining % 60000) / 1000);

  var urgencyMs = (style.urgencyThresholdMinutes || 60) * 60 * 1000;
  var isUrgent = remaining <= urgencyMs;
  var urgencyEffect = style.urgencyEffect || "none";

  var sizeClass = "helixo-size-" + (style.size || "medium");

  var wrapperStyle = {
    backgroundColor: style.backgroundColor || "#000000",
    color: style.textColor || "#FFFFFF",
  };

  var digitStyle = {
    backgroundColor: style.accentColor || "#FF6B35",
    color: style.textColor || "#FFFFFF",
  };

  var showLabels = style.showLabels !== false;
  var units = [
    { value: days, label: "Days" },
    { value: hours, label: "Hours" },
    { value: mins, label: "Mins" },
    { value: secs, label: "Secs" },
  ];

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  return h(
    "div",
    { class: sizeClass, style: { marginBottom: "8px" } },
    h(
      "div",
      { class: "helixo-timer-wrapper", style: wrapperStyle },
      // Label
      h(
        "div",
        { class: "helixo-timer-label" },
        style.displayText || "Sale ends in:"
      ),
      // Digits
      h(
        "div",
        { class: "helixo-timer-digits" },
        units.map(function (u, i) {
          return h(
            Fragment,
            { key: i },
            i > 0 && h("div", { class: "helixo-timer-separator" }, ":"),
            h(
              "div",
              { class: "helixo-timer-unit" },
              h(
                "span",
                { class: "helixo-timer-value", style: digitStyle },
                pad(u.value)
              ),
              showLabels &&
                h("span", { class: "helixo-timer-unit-label" }, u.label)
            )
          );
        })
      ),
      // Urgency message
      isUrgent &&
        urgencyEffect !== "none" &&
        h(
          "div",
          {
            class: "helixo-timer-urgency helixo-urgency-" + urgencyEffect,
            style: { color: style.accentColor || "#FF6B35" },
          },
          "Hurry! Almost over!"
        )
    )
  );
}
