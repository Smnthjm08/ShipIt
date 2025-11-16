import { NextResponse } from "next/server";
import prisma from "@workspace/db";
import { headers } from "next/headers";
import { auth } from "@workspace/shared/auth";
import { GitHubInstallation, Project } from "@/types/types";

interface DashboardResponse {
  projects: Project[];
  github: GitHubInstallation[];
}

export async function GET(): Promise<
  NextResponse<DashboardResponse | { error: string }>
> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const gitHubInstallation = await prisma.gitHubInstallation.findMany({
      where: { userId },
    });

    return NextResponse.json({
      projects,
      github: gitHubInstallation,
    });
  } catch (error) {
    console.error("Error fetching dashboard details:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
