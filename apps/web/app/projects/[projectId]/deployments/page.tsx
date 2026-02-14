import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { DeploymentTable } from "./deployment-table";

interface ProjectDeploymentsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectDeploymentsPage({
  params,
}: ProjectDeploymentsPageProps) {
  const { projectId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return notFound();
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
      isDeleted: false,
    },
  });

  if (!project) {
    return notFound();
  }

  const deployments = await prisma.deployment.findMany({
    where: {
      projectId: projectId,
      isDeleted: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Deployments</h1>
        <p className="text-muted-foreground">
          View and manage your deployment history
        </p>
      </div>

      <DeploymentTable deployments={deployments} />
    </div>
  );
}
