import { prisma, Deployment, DeploymentLog, Prisma } from "@repo/db";
import { enqueueBuild } from "@repo/shared";

export class DeploymentService {
  getAllDeployments(projectId: string): Promise<Deployment[]> {
    return prisma.deployment.findMany({
      where: { projectId, isDeleted: false },
      orderBy: { createdAt: "desc" },
    });
  }

  getDeploymentById(id: string): Promise<Deployment | null> {
    return prisma.deployment.findUnique({
      where: { id },
    });
  }

  createDeployment(data: Prisma.DeploymentCreateInput): Promise<Deployment> {
    return prisma.deployment.create({ data });
  }

  updateDeployment(
    id: string,
    data: Prisma.DeploymentUpdateInput,
  ): Promise<Deployment> {
    return prisma.deployment.update({
      where: { id },
      data,
    });
  }

  deleteDeployment(id: string): Promise<Deployment> {
    return prisma.deployment.delete({
      where: { id },
    });
  }

  /**
   * Fetch a deployment only if it belongs to `userId`. Every user-facing route
   * goes through this so a deployment id can't be used to read someone else's build.
   */
  getOwnedDeployment(id: string, userId: string): Promise<Deployment | null> {
    return prisma.deployment.findFirst({
      where: {
        id,
        isDeleted: false,
        project: { userId, isDeleted: false },
      },
    });
  }

  listOwnedDeployments(
    projectId: string,
    userId: string,
    { skip = 0, take = 20 }: { skip?: number; take?: number } = {},
  ): Promise<[Deployment[], number]> {
    const where: Prisma.DeploymentWhereInput = {
      projectId,
      isDeleted: false,
      project: { userId, isDeleted: false },
    };

    return Promise.all([
      prisma.deployment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.deployment.count({ where }),
    ]);
  }

  getLogs(
    deploymentId: string,
    { after, take = 500 }: { after?: Date; take?: number } = {},
  ): Promise<DeploymentLog[]> {
    return prisma.deploymentLog.findMany({
      where: {
        deploymentId,
        isDeleted: false,
        ...(after && { timestamp: { gt: after } }),
      },
      orderBy: { timestamp: "asc" },
      take,
    });
  }

  /** Create a fresh deployment for a project and push it onto the build queue. */
  async queueDeployment(projectId: string): Promise<Deployment> {
    const deployment = await prisma.deployment.create({
      data: { projectId, status: "QUEUED" },
    });
    await enqueueBuild(deployment.id);
    return deployment;
  }

  softDeleteDeployment(id: string): Promise<Deployment> {
    return prisma.deployment.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}

export const deploymentService = new DeploymentService();
