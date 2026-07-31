"use client";

import { useEffect } from "react";

/**
 * Re-runs `refresh` on an interval while `enabled` is true.
 *
 * Deploy lists are only interesting while something is moving, so callers pass
 * `enabled` = "any deployment is still queued, cloning or building". Once
 * everything reaches a terminal state the interval is torn down and the page
 * goes quiet — no background polling on a screen full of finished builds.
 */
export function useLiveRefresh(
  refresh: () => void,
  enabled: boolean,
  intervalMs = 5000,
) {
  useEffect(() => {
    if (!enabled) return;

    // Pause while the tab is hidden; refresh once on the way back so the user
    // never returns to stale status.
    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const timer = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, enabled, intervalMs]);
}
