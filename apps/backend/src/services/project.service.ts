import { prisma, Project, Prisma } from "@repo/db";

export class ProjectService {
  listProjects(
    userId: string,
    {
      skip = 0,
      take = 10,
      search = "",
    }: { skip?: number; take?: number; search?: string } = {},
  ): Promise<[Project[], number]> {
    const where: Prisma.ProjectWhereInput = {
      userId,
      isDeleted: false,
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
    };

    return Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          deployments: {
            where: { isDeleted: false },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.project.count({ where }),
    ]);
  }

  getOwnedProject(id: string, userId: string) {
    return prisma.project.findFirst({
      where: { id, userId, isDeleted: false },
      include: {
        deployments: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }

  updateProject(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return prisma.project.update({ where: { id }, data });
  }

  /** Soft delete: the project row and its deployments stay for audit/history. */
  async softDeleteProject(id: string): Promise<void> {
    await prisma.$transaction([
      prisma.project.update({ where: { id }, data: { isDeleted: true } }),
      prisma.deployment.updateMany({
        where: { projectId: id },
        data: { isDeleted: true },
      }),
    ]);
  }
}

export const projectService = new ProjectService();
