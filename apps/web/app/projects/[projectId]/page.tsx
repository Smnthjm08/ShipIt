"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, Github, ExternalLink, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Deployment {
  id: string;
  status: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  repoUrl: string;
  packageManager: string;
  installCommand: string;
  buildCommand: string;
  outputDir: string;
  framework: string;
  deployments: Deployment[];
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/api/projects/${projectId}`);
        setProject(response.data.data);
      } catch (err) {
        console.error("Error fetching project:", err);
        setError("Failed to load project details");
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error || "Project not found"}</p>
        <Button variant="outline" asChild>
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>
    );
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
              <Badge variant="secondary">{project.framework}</Badge>
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
                    {new Date(latestDeployment.createdAt).toLocaleString()}
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
