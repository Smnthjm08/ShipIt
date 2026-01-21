import { redisQueue } from "@repo/shared";
import { prisma } from "@repo/db";
import { cloneRepo } from "./git/clone-repo";

async function startWorker() {
    if (!redisQueue.isOpen) {
        console.log("Waiting for Redis connection...");
        await redisQueue.connect();
        console.log("Redis connected successfully");
    }

    console.log("Worker started, waiting for deployments...");

    while (true) {
        try {
            console.log("Waiting for deployment...");
            const deploymentId = await redisQueue.brPop("deploymentId", 0);
            console.log("Received deploymentId:", deploymentId.element);

            const deployment = await prisma.deployment.findUnique({
                where: { id: deploymentId.element },
                include: {
                    project: {
                        include: {
                            user: {
                                include: {
                                    accounts: true
                                }
                            }
                        }
                    }
                }
            });

            if (!deployment) {
                throw new Error(`Deployment ${deploymentId.element} not found`);
            }

            const repoDir = await cloneRepo(deployment);
            console.log("Repo cloned successfully:", repoDir);

            // new docker container should be created for each deployment
            // copy the deploymentId folder to the docker container
            // run the build commandin docker container
            // once built, the container should be stopped and removed
            // the built folder to be uploaded to s3
        } catch (error) {
            console.error("Error processing deployment:", error);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

startWorker();
