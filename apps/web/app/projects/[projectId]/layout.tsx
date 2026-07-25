import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { prisma } from "@repo/db";
import { notFound } from "next/navigation";
import { ProjectTabs } from "./project-tabs";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { projectId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return notFound(); // Or redirect to login
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId: session.user.id,
      isDeleted: false,
    },
  });

  // If project is deleted or doesn't exist, we might want to show 404 or redirect.
  // Since this is a layout, returning notFound() will render the closest not-found.tsx
  if (!project) {
    return notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <ProjectTabs projectId={projectId} projectName={project.name} />
      {children}
    </div>
  );
}
