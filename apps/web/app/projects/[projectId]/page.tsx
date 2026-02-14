import { notFound } from "next/navigation";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { ExternalLink, Github, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
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
    include: {
      deployments: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!project) {
    return notFound();
  }

  const latestDeployment = project.deployments[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            <Github className="h-4 w-4" />
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {project.repoUrl.replace("https://github.com/", "")}
            </a>
          </div>
        </div>
        {latestDeployment && latestDeployment.status === "COMPLETED" && (
          <Button asChild>
            <a
              href={`http://${latestDeployment.id}.localhost:8001`} // TODO: dynamic domain
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Build Configuration</CardTitle>
            <CardDescription>
              Settings used to build your application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Framework</span>
              <Badge variant="secondary">
                {project.framework || "Unknown"}
              </Badge>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Build Command</span>
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-mono">
                <Terminal className="h-4 w-4" />
                {project.buildCommand || "npm run build"}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Output Directory</span>
              <div className="rounded-md bg-muted px-3 py-2 text-sm font-mono">
                {project.outputDir || "dist"}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Install Command</span>
              <div className="rounded-md bg-muted px-3 py-2 text-sm font-mono">
                {project.installCommand || "npm install"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Deployment</CardTitle>
            <CardDescription>Status of the most recent build</CardDescription>
          </CardHeader>
          <CardContent>
            {latestDeployment ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge
                    variant={
                      latestDeployment.status === "COMPLETED"
                        ? "default"
                        : latestDeployment.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {latestDeployment.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Deployment ID</span>
                  <span className="text-sm font-mono text-muted-foreground">
                    {latestDeployment.id}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Created</span>
                  <span className="text-sm text-muted-foreground">
                    {latestDeployment.createdAt.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No deployments yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
