/**
 * Calculate the end time for a timer.
 * Fixed timers use the server-provided endDate.
 * Evergreen timers use localStorage to persist a per-visitor start time.
 * If the stored end time has passed, the timer resets for a new cycle.
 */
export function getEndTime(timer) {
  if (timer.type === "fixed") {
    return new Date(timer.endDate).getTime();
  }

  // Evergreen — session-based via localStorage
  var key = "helixo_timer_" + timer.id;
  try {
    var stored = localStorage.getItem(key);
    if (stored) {
      var endTime = parseInt(stored, 10);
      if (endTime > Date.now()) {
        return endTime;
      }
      // Expired — reset for a new cycle
      localStorage.removeItem(key);
    }

    var endTime = Date.now() + timer.duration * 60 * 1000;
    localStorage.setItem(key, String(endTime));
    return endTime;
  } catch (e) {
    // localStorage unavailable — use a transient in-memory timer
    return Date.now() + timer.duration * 60 * 1000;
  }
}
