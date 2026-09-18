import fs from "fs";
import {
  connectRedis,
  reserveBuild,
  ackBuild,
  recoverStaleBuilds,
  publishDeploymentLog,
  subscribeCancellations,
} from "@repo/shared";
import { logger, deploymentLogger, type Logger } from "@repo/shared/logger";
import { requireEnv, SHIPYARD_REQUIRED_ENV } from "@repo/shared/env/require";
import { prisma, DeploymentStatus } from "@repo/db";
import { cloneRepo } from "./git/clone-repo.js";
import { buildInContainer } from "./build/run-build.js";
import { decryptProjectEnv } from "./env/project-env.js";
import { updateDeploymentStatus } from "./queries/deployment-status.js";
import { startHealthServer } from "./health.js";
import { DeploymentCancelled } from "./cancellation.js";

/** Did this deployment get cancelled while we were building it? */
async function wasCancelled(deploymentId: string | null): Promise<boolean> {
  if (!deploymentId) return false;
  const row = await prisma.deployment
    .findUnique({ where: { id: deploymentId }, select: { status: true } })
    .catch(() => null);
  return row?.status === "CANCELLED";
}

/**
 * Update status in the DB and tell any live log watchers about it.
 *
 * Returns false when the deployment has since been cancelled — the write is
 * refused (CANCELLED is terminal) and nothing is announced, because a cancelled
 * build has no business reporting that it is now building or completed.
 */
async function setStatus(
  deploymentId: string,
  status: DeploymentStatus,
): Promise<boolean> {
  const applied = await updateDeploymentStatus(deploymentId, status);
  if (!applied) return false;

  await publishDeploymentLog({
    deploymentId,
    message: `Deployment ${status.toLowerCase()}`,
    timestamp: new Date().toISOString(),
    status,
    done: status === "COMPLETED" || status === "FAILED",
  });
  return true;
}

// The build currently in this worker's hands, and how to stop it.
//
// `activeDeploymentId` is set the moment a job is reserved, not when its
// container starts: a cancel arriving while the repo clones or the build image
// pulls belongs to this build too, and matching on it is how we know that.
// `stopActiveContainer` exists only for the window a container does, so
// `cancelRequested` records the requests that land outside it — the checkpoints
// through the build read it and stop rather than carrying on.
let activeDeploymentId: string | null = null;
let stopActiveContainer: (() => Promise<void>) | null = null;
let cancelRequested = false;

async function startWorker() {
  // A build that reaches the upload step with no bucket configured has already
  // burned minutes of container time for nothing.
  requireEnv(SHIPYARD_REQUIRED_ENV, "shipyard");

  // Before connectRedis(), so a worker that can't reach Redis is still able to
  // report that rather than looking dead.
  startHealthServer(() => ({ activeDeploymentId }));

  await connectRedis();
  logger.info("Redis connected");

  // A build that was in flight when the worker last died is still parked on the
  // processing list — put it back on the queue instead of losing it.
  const { requeued, deadLettered } = await recoverStaleBuilds();
  if (requeued.length) {
    logger.warn({ requeued }, "Requeued orphaned deployments");
  }
  if (deadLettered.length) {
    // These crashed the worker MAX_BUILD_ATTEMPTS times. Mark them FAILED so the
    // UI stops showing a build that will never run, and leave them on the
    // dead-letter list for inspection or `replayDeadLetter()`.
    logger.error(
      { deadLettered },
      "Deployments set aside after repeated worker crashes",
    );
    for (const deploymentId of deadLettered) {
      await setStatus(deploymentId, DeploymentStatus.FAILED).catch((err) =>
        logger.error(
          { err, deploymentId },
          "Could not mark dead letter FAILED",
        ),
      );
      await prisma.deploymentLog
        .create({
          data: {
            deploymentId,
            message:
              "Build abandoned: it crashed the build worker repeatedly. Check the build command and try again.",
          },
        })
        .catch(() => {});
    }
  }

  // One subscription for the worker's lifetime; requests for a build this
  // worker isn't running are ignored rather than racing another instance.
  await subscribeCancellations(async (deploymentId) => {
    if (deploymentId !== activeDeploymentId) return;
    cancelRequested = true;

    // Between steps: there is no container yet (still cloning, or pulling the
    // build image) or it has already exited. Recorded above; the next
    // checkpoint stops the build.
    if (!stopActiveContainer) {
      logger.warn(
        { deploymentId },
        "Cancellation requested — no container to stop yet",
      );
      return;
    }

    logger.warn(
      { deploymentId },
      "Cancellation requested — stopping container",
    );
    await stopActiveContainer().catch((err) =>
      logger.error({ err, deploymentId }, "Could not stop container"),
    );
  });

  logger.info("Worker started, waiting for deployments");

  while (true) {
    let deploymentIdElement: string | null = null;
    let repoDir: string | null = null;
    // Rebound once a job is reserved, so every line below carries its id.
    let log: Logger = logger;
    try {
      deploymentIdElement = await reserveBuild(0);
      if (!deploymentIdElement) continue;
      // Claimed before the first await below, so a cancellation published from
      // here on matches this build instead of being dropped as unknown.
      activeDeploymentId = deploymentIdElement;
      log = deploymentLogger(deploymentIdElement);
      log.info("Reserved deployment");

      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentIdElement },
        include: {
          project: {
            include: {
              envVars: true,
              user: {
                include: {
                  accounts: true,
                },
              },
            },
          },
        },
      });

      if (!deployment) {
        throw new Error(`Deployment ${deploymentIdElement} not found`);
      }

      // Cancelled while it sat in the queue: the row is already CANCELLED, so
      // there is nothing to build and nothing to mark failed.
      if (deployment.status === "CANCELLED") {
        log.info("Skipping deployment cancelled before it started");
        continue;
      }

      // Every setStatus below doubles as a cancellation checkpoint: it refuses
      // to write over CANCELLED and says so, which is the one place a cancel
      // that arrived between steps is guaranteed to be noticed.
      if (!(await setStatus(deployment.id, DeploymentStatus.CLONING))) {
        throw new DeploymentCancelled();
      }

      repoDir = await cloneRepo(deployment);
      log.info({ repoDir }, "Repo cloned");

      if (!(await setStatus(deployment.id, DeploymentStatus.BUILDING))) {
        throw new DeploymentCancelled();
      }

      // Decrypt here rather than inside the build so a bad key fails the
      // deployment with a clear message instead of a mid-build error.
      const envVars = decryptProjectEnv(deployment.project.envVars);

      // new docker container should be created for each deployment
      await buildInContainer(
        deployment.id,
        repoDir,
        deployment.project.id,
        deployment.project.buildCommand || "",
        deployment.project.installCommand || "",
        deployment.project.rootDir || "",
        deployment.project.outputDir || "",
        deployment.project.framework,
        envVars,
        {
          onContainerStart: (stop) => {
            stopActiveContainer = stop;
          },
          requested: () => cancelRequested,
        },
      );
      log.info("Build finished");

      if (!(await setStatus(deployment.id, DeploymentStatus.COMPLETED))) {
        throw new DeploymentCancelled();
      }

      // A newer successful build supersedes any rollback pin. Without this,
      // rolling back and then deploying a fix would appear to do nothing —
      // the proxy would keep serving the pinned build forever.
      if (deployment.project.activeDeploymentId) {
        await prisma.project
          .update({
            where: { id: deployment.project.id },
            data: { activeDeploymentId: null },
          })
          .then(() => log.info("Cleared rollback pin — newer build is live"))
          .catch((err) => log.error({ err }, "Could not clear rollback pin"));
      }
    } catch (error) {
      // A cancelled build throws — either the container was stopped under it, or
      // a checkpoint refused to carry it further. That is the expected path, not
      // a failure, so leave the CANCELLED status alone. The DB is still consulted
      // as well: a cancel can be missed entirely if Redis was down when it was
      // published, and the row is the source of truth.
      const cancelled =
        error instanceof DeploymentCancelled ||
        (await wasCancelled(deploymentIdElement));
      if (cancelled) {
        log.info("Deployment cancelled");
        const message = "Deployment cancelled";
        // Persisted as well as published, so the line is still there when the
        // page is reloaded rather than only reaching whoever was watching live.
        await prisma.deploymentLog
          .create({
            data: { deploymentId: deploymentIdElement!, message },
          })
          .catch((err) =>
            log.error({ err }, "Could not persist cancellation log"),
          );
        await publishDeploymentLog({
          deploymentId: deploymentIdElement!,
          message,
          timestamp: new Date().toISOString(),
          status: "CANCELLED",
          done: true,
        });
        continue;
      }

      log.error({ err: error }, "Deployment failed");
      if (deploymentIdElement) {
        const message =
          error instanceof Error ? error.message : "Unknown build error";
        try {
          await prisma.deploymentLog.create({
            data: { deploymentId: deploymentIdElement, message },
          });
          await publishDeploymentLog({
            deploymentId: deploymentIdElement,
            message,
            timestamp: new Date().toISOString(),
          });
          await setStatus(deploymentIdElement, DeploymentStatus.FAILED);
        } catch (e) {
          log.error({ err: e }, "Could not mark deployment FAILED");
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      activeDeploymentId = null;
      stopActiveContainer = null;
      cancelRequested = false;
      // The job reached a terminal state (COMPLETED or FAILED) — drop it from the
      // processing list so startup recovery doesn't replay it.
      if (deploymentIdElement) {
        try {
          await ackBuild(deploymentIdElement);
        } catch (e) {
          log.error({ err: e }, "Could not ack deployment");
        }
      }
      // Always remove the cloned repo so the worker's disk doesn't fill up.
      if (repoDir && fs.existsSync(repoDir)) {
        try {
          fs.rmSync(repoDir, { recursive: true, force: true });
          log.debug({ repoDir }, "Cleaned up clone dir");
        } catch (e) {
          log.error({ err: e, repoDir }, "Could not clean up clone dir");
        }
      }
    }
  }
}

startWorker().catch((err) => {
  logger.error({ err }, "Worker failed to start");
  process.exit(1);
});
