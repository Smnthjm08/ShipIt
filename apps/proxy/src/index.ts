import express from "express";
import { BASE_DOMAIN, HEALTH_PATH, PORT } from "./config";
import { resolveDeployment, subdomainFor } from "./resolve";
import { errorPage, serveDeployment } from "./serve";

const app = express();

app.disable("x-powered-by");
// Deployments sit behind a load balancer / tunnel in any real setup, so the
// site to serve comes from X-Forwarded-Host rather than the socket's host.
app.set("trust proxy", true);

app.use(async (req, res) => {
  if (req.path === HEALTH_PATH) {
    return res.json({ status: "OK", baseDomain: BASE_DOMAIN || null });
  }

  // Static hosting answers reads only. Anything else is a client bug, and
  // replying 200 with the homepage (as this used to) hides it.
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.set("Allow", "GET, HEAD");
    return res
      .status(405)
      .type("html")
      .send(
        errorPage(
          "405",
          "Method not allowed",
          "This deployment only serves static files.",
        ),
      );
  }

  const subdomain = subdomainFor(req.hostname);
  if (!subdomain) {
    return res
      .status(404)
      .type("html")
      .send(
        errorPage(
          "404",
          "No site here",
          "Deployments are served from their own subdomain.",
        ),
      );
  }

  try {
    const route = await resolveDeployment(subdomain);

    switch (route.kind) {
      case "ready":
        return await serveDeployment(route.deploymentId, req, res);

      case "pending":
        // 503 + Retry-After so crawlers and uptime checks come back rather than
        // recording the URL as permanently gone.
        res.set("Retry-After", "10");
        return res
          .status(503)
          .type("html")
          .send(
            errorPage(
              "503",
              "Build in progress",
              `This deployment is <strong>${route.status.toLowerCase()}</strong>. Refresh in a moment.`,
            ),
          );

      case "failed":
        return res
          .status(404)
          .type("html")
          .send(
            errorPage(
              "404",
              "Nothing deployed",
              "The most recent build for this project didn’t succeed. Check the build logs in your dashboard.",
            ),
          );

      default:
        return res
          .status(404)
          .type("html")
          .send(
            errorPage(
              "404",
              "Deployment not found",
              "If you think this is a mistake, contact the owner of the project.",
            ),
          );
    }
  } catch (error) {
    console.error(`Error serving ${req.hostname}${req.originalUrl}:`, error);
    if (res.headersSent) {
      res.destroy();
      return;
    }
    return res
      .status(502)
      .type("html")
      .send(
        errorPage(
          "502",
          "Upstream error",
          "This deployment’s files could not be read from storage.",
        ),
      );
  }
});

app.listen(PORT, () => {
  console.log(
    `Proxy server running on port ${PORT}` +
      (BASE_DOMAIN ? ` (serving *.${BASE_DOMAIN})` : " (serving *.localhost)"),
  );
});
