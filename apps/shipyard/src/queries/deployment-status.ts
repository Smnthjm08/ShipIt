import { prisma } from "@repo/db";
import { DeploymentStatus } from "@repo/db";

/**
 * Move a deployment to `status`, unless it has already been CANCELLED.
 *
 * CANCELLED is terminal. A cancel lands while the worker is mid-step — cloning,
 * pulling the build image, finishing a build — and an unguarded update would
 * quietly overwrite it, so a deployment the user stopped would carry on to
 * BUILDING and then COMPLETED and go live. Guarding the write itself means no
 * caller can undo a cancellation by forgetting to check first.
 *
 * Returns false when the row was already CANCELLED, so callers can stop.
 */
export const updateDeploymentStatus = async (
  deploymentId: string,
  status: DeploymentStatus,
): Promise<boolean> => {
  const { count } = await prisma.deployment.updateMany({
    where: {
      id: deploymentId,
      status: { not: DeploymentStatus.CANCELLED },
    },
    data: {
      status: status,
    },
  });
  return count > 0;
};
