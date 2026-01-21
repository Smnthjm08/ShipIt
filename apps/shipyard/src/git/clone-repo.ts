import simpleGit from "simple-git";
import path from "path";
import { updateDeploymentStatus } from "../queries/deployment-status";
import { DeploymentStatus, Prisma } from "@repo/db";
import fs from "fs";

// Type for deployment with all necessary relations
type DeploymentWithRelations = Prisma.DeploymentGetPayload<{
  include: {
    project: {
      include: {
        user: {
          include: {
            accounts: true;
          };
        };
      };
    };
  };
}>;

export const cloneRepo = async (deployment: DeploymentWithRelations) => {
  const githubAccountToken = deployment.project.user.accounts[0]?.accessToken;
  if (!githubAccountToken) {
    throw new Error("No GitHub OAuth access token found for this user.");
  }

  let repoUrl = deployment.project.repoUrl;
  if (repoUrl.startsWith("https://github.com/")) {
    repoUrl = repoUrl.replace(
      "https://github.com/",
      `https://oauth2:${githubAccountToken}@github.com/`,
    );
  }
  await updateDeploymentStatus(deployment.id, DeploymentStatus.CLONING);

  const git = simpleGit();

  const repoRoot = path.join(process.cwd(), "repositories");
  const cloneDir = path.join(repoRoot, deployment.id);

  if (!fs.existsSync(repoRoot)) {
    fs.mkdirSync(repoRoot, { recursive: true });
  }

  if (fs.existsSync(cloneDir)) {
    fs.rmSync(cloneDir, { recursive: true, force: true });
  }

  await git.clone(repoUrl, cloneDir);

  return cloneDir;
};
