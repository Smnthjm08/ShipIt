import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { DeploymentLogs } from "./deployment-logs";
import { deploymentUrl } from "@/lib/deployment-url";

interface DeploymentPageProps {
  params: Promise<{ projectId: string; deploymentId: string }>;
}

export default async function DeploymentPage({ params }: DeploymentPageProps) {
  const { projectId, deploymentId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return notFound();
  }

  const deployment = await prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      projectId,
      isDeleted: false,
      project: { userId: session.user.id, isDeleted: false },
    },
    include: {
      project: true,
      logs: {
        where: { isDeleted: false },
        orderBy: { timestamp: "asc" },
        take: 1000,
      },
    },
  });

  if (!deployment) {
    return notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            href={`/projects/${projectId}/deployments`}
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All deployments
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            {deployment.project.name}
          </h1>
          <p className="text-muted-foreground font-mono text-xs">
            {deployment.id}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant={
              deployment.status === "COMPLETED"
                ? "default"
                : deployment.status === "FAILED"
                  ? "destructive"
                  : "secondary"
            }
          >
            {deployment.status}
          </Badge>
          {deployment.status === "COMPLETED" && (
            <Button asChild variant="outline" size="sm">
              <a
                href={deploymentUrl(deployment.id)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit
              </a>
            </Button>
          )}
        </div>
      </div>

      <DeploymentLogs
        deploymentId={deployment.id}
        initialStatus={deployment.status}
        initialLogs={deployment.logs.map((log) => ({
          id: log.id,
          message: log.message,
          timestamp: log.timestamp.toISOString(),
        }))}
      />
    </div>
  );
}
