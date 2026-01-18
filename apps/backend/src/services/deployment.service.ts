import { prisma, Deployment, Prisma } from "@repo/db";

export class DeploymentService {
  getAllDeployments(projectId: string): Promise<Deployment[]> {
    return prisma.deployment.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }

  getDeploymentById(id: string): Promise<Deployment | null> {
    return prisma.deployment.findUnique({
      where: { id },
      // include: { deployment_logs: true },
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
}

export const deploymentService = new DeploymentService();
