import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { prisma } from "@repo/db";
import { notFound } from "next/navigation";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

/**
 * Guards the project routes. Navigation used to live here as a horizontal tab
 * strip — it now lives in the sidebar, which switches into project mode for
 * these routes, so the layout only has to own access control and page padding.
 */
export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
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
    select: { id: true },
  });

  if (!project) {
    return notFound();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
      {children}
    </div>
  );
}
