/**
 * Public URL a deployment is served on by the proxy.
 *
 * `NEXT_PUBLIC_DEPLOY_HOST` is the wildcard host (with port, if any) that the
 * proxy answers on — `localhost:8001` in development, `shipit.dev` in
 * production. It must line up with the proxy's `DEPLOY_BASE_DOMAIN`.
 */
const DEPLOY_HOST = process.env.NEXT_PUBLIC_DEPLOY_HOST || "localhost:8001";

export function deploymentUrl(deploymentId: string): string {
  const protocol = /^localhost(:|$)/.test(DEPLOY_HOST) ? "http" : "https";
  return `${protocol}://${deploymentId}.${DEPLOY_HOST}`;
}
