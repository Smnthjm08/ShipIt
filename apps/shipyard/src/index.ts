import { redisQueue } from "@workspace/shared/redis/queue";
import { redisPub } from "@workspace/shared/redis/publisher";
import path from "path";
import dotenv from "dotenv";
import simpleGit from "simple-git";
import fs from "fs";
import { updateDeploymentStaus } from "./db-interactions";

dotenv.config({ path: "../../.env" });

type account = {
  providerId: string;
  accessToken: string | null;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  accountId: string;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
};

async function startWorker() {
  while (true) {
    console.log("starting shipyard...");

    const job = await redisQueue.brPop("deployment-id", 0);
    if (!job) continue;

    console.log("job from redis queue", job);
    const deploymentId = job.element;

    const updatedDeployment = await updateDeploymentStaus({
      deploymentId,
      status: "building",
    });

    await redisPub.publish(`logs-${deploymentId}`, "Deployment Started...");

    const githubAccount = updatedDeployment.project.user.accounts.find(
      (acc: account) => acc.providerId === "github",
    );

    if (!githubAccount?.accessToken) {
      throw new Error("No GitHub OAuth access token found for this user.");
    }

    const githubToken = githubAccount.accessToken;

    const appRoot = path.join(__dirname, "..");
    const repoRoot = path.join(appRoot, "repositories");
    const cloneDir = path.join(repoRoot, deploymentId);

    if (!fs.existsSync(repoRoot)) {
      fs.mkdirSync(repoRoot, { recursive: true });
    }

    if (fs.existsSync(cloneDir)) {
      fs.rmSync(cloneDir, { recursive: true, force: true });
    }

    let repoUrl = updatedDeployment.project.repoUrl;

    if (!repoUrl.endsWith(".git")) {
      repoUrl += ".git";
    }

    const authedUrl = repoUrl.replace("https://", `https://${githubToken}@`);

    console.log("Cloning:", authedUrl);

    await redisPub.publish(`logs-${deploymentId}`, "Cloning repository...");

    const git = simpleGit();
    await git.clone(authedUrl, cloneDir);

    console.log("Cloned into:", cloneDir);

    await redisPub.publish(
      `logs-${deploymentId}`,
      "Repository cloned successfully!",
    );

    // install dependencies
    // build
    // upload build
    // finish deployment

    return;
  }
}

startWorker();
