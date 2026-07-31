/**
 * Formatting helpers for machine-generated values — timestamps, durations and
 * IDs. Deploy platforms live on "how long ago" and "how long did it take", so
 * these are used everywhere a raw `toLocaleString()` used to be.
 */

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;

/** "just now" · "4m ago" · "3h ago" · "2d ago" · then an absolute date. */
export function relativeTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 10) return "just now";
  if (seconds < MINUTE) return `${seconds}s ago`;
  if (seconds < HOUR) return `${Math.floor(seconds / MINUTE)}m ago`;
  if (seconds < DAY) return `${Math.floor(seconds / HOUR)}h ago`;
  if (seconds < DAY * 7) return `${Math.floor(seconds / DAY)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
  });
}

/** Full timestamp for the `title` tooltip behind a relative time. */
export function absoluteTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Build duration as "42s" / "3m 08s". Returns null while still running. */
export function duration(
  start: Date | string,
  end: Date | string | null | undefined,
): string | null {
  if (!end) return null;
  const from = typeof start === "string" ? new Date(start) : start;
  const to = typeof end === "string" ? new Date(end) : end;

  const seconds = Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / 1000),
  );
  if (seconds < MINUTE) return `${seconds}s`;

  const minutes = Math.floor(seconds / MINUTE);
  const rest = seconds % MINUTE;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

/** Live elapsed clock while a build runs — "1:24". */
export function elapsed(
  start: Date | string,
  now: number = Date.now(),
): string {
  const from = typeof start === "string" ? new Date(start) : start;
  const seconds = Math.max(0, Math.round((now - from.getTime()) / 1000));
  const minutes = Math.floor(seconds / MINUTE);
  return `${minutes}:${String(seconds % MINUTE).padStart(2, "0")}`;
}

/**
 * cuids are 25 characters and unreadable at a glance. Show the tail — it's the
 * random part, so it's what actually distinguishes two deployments.
 */
export function shortId(id: string, length = 8): string {
  return id.length <= length ? id : id.slice(-length);
}

/** Strip the github.com prefix so repo links read as `owner/name`. */
export function repoSlug(repoUrl: string): string {
  return repoUrl
    .replace(/^https?:\/\/(www\.)?github\.com\//, "")
    .replace(/\.git$/, "");
}
