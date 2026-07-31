import fs from "fs";
import {
  connectRedis,
  reserveBuild,
  ackBuild,
  recoverStaleBuilds,
  publishDeploymentLog,
} from "@repo/shared";
import { prisma, DeploymentStatus } from "@repo/db";
import { cloneRepo } from "./git/clone-repo";
import { buildInContainer } from "./build-in-container";
import { decryptProjectEnv } from "./env/project-env";
import { updateDeploymentStatus } from "./queries/deployment-status";

/** Update status in the DB and tell any live log watchers about it. */
async function setStatus(deploymentId: string, status: DeploymentStatus) {
  await updateDeploymentStatus(deploymentId, status);
  await publishDeploymentLog({
    deploymentId,
    message: `Deployment ${status.toLowerCase()}`,
    timestamp: new Date().toISOString(),
    status,
    done: status === "COMPLETED" || status === "FAILED",
  });
}

async function startWorker() {
  await connectRedis();
  console.log("Redis connected successfully");

  // A build that was in flight when the worker last died is still parked on the
  // processing list — put it back on the queue instead of losing it.
  const recovered = await recoverStaleBuilds();
  if (recovered.length) {
    console.log("Requeued orphaned deployments:", recovered.join(", "));
  }

  console.log("Worker started, waiting for deployments...");

  while (true) {
    let deploymentIdElement: string | null = null;
    let repoDir: string | null = null;
    try {
      console.log("Waiting for deployment...");
      deploymentIdElement = await reserveBuild(0);
      if (!deploymentIdElement) continue;
      console.log("Received deploymentId:", deploymentIdElement);

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

      await setStatus(deployment.id, DeploymentStatus.CLONING);

      repoDir = await cloneRepo(deployment);
      console.log("Repo cloned successfully:", repoDir);

      await setStatus(deployment.id, DeploymentStatus.BUILDING);

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
      );
      console.log("Docker build successfull");

      await setStatus(deployment.id, DeploymentStatus.COMPLETED);
    } catch (error) {
      console.error("Error processing deployment:", error);
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
          console.error("Failed to update deployment status to FAILED", e);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      // The job reached a terminal state (COMPLETED or FAILED) — drop it from the
      // processing list so startup recovery doesn't replay it.
      if (deploymentIdElement) {
        try {
          await ackBuild(deploymentIdElement);
        } catch (e) {
          console.error("Failed to ack deployment:", deploymentIdElement, e);
        }
      }
      // Always remove the cloned repo so the worker's disk doesn't fill up.
      if (repoDir && fs.existsSync(repoDir)) {
        try {
          fs.rmSync(repoDir, { recursive: true, force: true });
          console.log("Cleaned up clone dir:", repoDir);
        } catch (e) {
          console.error("Failed to clean up clone dir:", repoDir, e);
        }
      }
    }
  }
}

startWorker();
