/**
 * Proxy configuration.
 *
 * `PROXY_PORT` is read before `PORT` because `PORT` is a global Turborepo env
 * var already claimed by the backend — sharing it would make both servers try
 * to bind the same port in a single-process host.
 */
export const PORT = Number(process.env.PROXY_PORT || process.env.PORT) || 8001;

/**
 * The wildcard domain deployments are served under, e.g. `shipit.dev` so that
 * `<deployment-id>.shipit.dev` resolves. Leave unset for local development,
 * where any `<id>.localhost` host works.
 *
 * When set, a request whose host isn't a direct child of this domain is
 * rejected instead of being parsed for a subdomain — that stops the apex and
 * unrelated hosts pointed at this server from resolving to someone's site.
 */
export const BASE_DOMAIN = (process.env.DEPLOY_BASE_DOMAIN || "")
  .trim()
  .toLowerCase()
  .replace(/^\./, "");

/** How long a resolved subdomain → deployment mapping is trusted. */
export const ROUTE_CACHE_TTL_MS =
  Number(process.env.PROXY_ROUTE_CACHE_TTL_MS) || 30_000;

/**
 * Negative and in-progress lookups get a much shorter TTL so a site appears
 * promptly once its first build finishes.
 */
export const ROUTE_CACHE_MISS_TTL_MS =
  Number(process.env.PROXY_ROUTE_CACHE_MISS_TTL_MS) || 5_000;

/** Upper bound on cached routes, so a flood of bogus hosts can't grow the map forever. */
export const ROUTE_CACHE_MAX_ENTRIES = 5_000;

/** Path reserved for health checks; namespaced so it can't collide with a user's file. */
export const HEALTH_PATH = "/__shipit/health";
