import { redisQueue } from "@repo/shared";
import { prisma } from "@repo/db";
import { cloneRepo } from "./git/clone-repo";
import { buildInContainer } from "./build-in-container";

async function startWorker() {
  if (!redisQueue.isOpen) {
    console.log("Waiting for Redis connection...");
    await redisQueue.connect();
    console.log("Redis connected successfully");
  }

  console.log("Worker started, waiting for deployments...");

  while (true) {
    let deploymentIdElement: string | null = null;
    try {
      console.log("Waiting for deployment...");
      const deploymentId = await redisQueue.brPop("deploymentId", 0);
      if (!deploymentId) continue;
      deploymentIdElement = deploymentId.element;
      console.log("Received deploymentId:", deploymentIdElement);

      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId.element },
        include: {
          project: {
            include: {
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

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "CLONING" },
      });

      const repoDir = await cloneRepo(deployment);
      console.log("Repo cloned successfully:", repoDir);

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "BUILDING" },
      });

      // new docker container should be created for each deployment
      await buildInContainer(
        deployment.id,
        repoDir,
        deployment.project.id,
        deployment.project.buildCommand || "",
        deployment.project.installCommand || "",
        deployment.project.rootDir || "",
        deployment.project.outputDir || "",
      );
      console.log("Docker build successfull");

      await prisma.deployment.update({
        where: { id: deployment.id },
        data: { status: "COMPLETED" },
      });
    } catch (error) {
      console.error("Error processing deployment:", error);
      if (deploymentIdElement) {
        try {
          await prisma.deployment.update({
            where: { id: deploymentIdElement },
            data: { status: "FAILED" },
          });
        } catch (e) {
          console.error("Failed to update deployment status to FAILED", e);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

startWorker();
