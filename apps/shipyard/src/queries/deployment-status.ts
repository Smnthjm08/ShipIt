import { prisma } from "@repo/db";
import { DeploymentStatus } from "@repo/db";

export const updateDeploymentStatus = async (
  deploymentId: string,
  status: DeploymentStatus,
) => {
  const deployment = await prisma.deployment.update({
    where: {
      id: deploymentId,
    },
    data: {
      status: status,
    },
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
  return deployment;
};
