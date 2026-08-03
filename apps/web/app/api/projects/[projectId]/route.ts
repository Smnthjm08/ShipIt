import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { AuthSession } from "@/types/session";
import { prisma } from "@repo/db";
import {
  firstValidationError,
  updateProjectSchema,
} from "@repo/shared/validation/project";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = (await auth.api.getSession({
      headers: await headers(),
    })) as AuthSession | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.user.id,
        isDeleted: false,
      },
      include: {
        deployments: {
          take: 5,
          orderBy: { createdAt: "desc" },
          where: { isDeleted: false },
        },
        // Drives the count badges in the project sidebar.
        _count: { select: { envVars: true, deployments: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: project,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = (await auth.api.getSession({
      headers: await headers(),
    })) as AuthSession | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.user.id,
        isDeleted: false,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.project.update({
        where: { id: projectId },
        data: { isDeleted: true },
      }),
      prisma.deployment.updateMany({
        where: { projectId: projectId },
        data: { isDeleted: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const session = (await auth.api.getSession({
      headers: await headers(),
    })) as AuthSession | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const parsed = updateProjectSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: firstValidationError(parsed.error) },
        { status: 400 },
      );
    }

    const {
      name,
      description,
      framework,
      buildCommand,
      installCommand,
      rootDir,
      outputDir,
      branch,
    } = parsed.data;

    // Verify project ownership and existence
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: session.user.id,
        isDeleted: false,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Build settings are patchable: only fields present in the body change, so
    // the general-settings form and the build-config form can each save
    // independently without clobbering the other's values.
    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(framework !== undefined && { framework }),
        ...(buildCommand !== undefined && { buildCommand }),
        ...(installCommand !== undefined && { installCommand }),
        ...(rootDir !== undefined && { rootDir }),
        ...(outputDir !== undefined && { outputDir }),
        ...(branch !== undefined && { branch }),
      },
    });

    return NextResponse.json({
      data: updatedProject,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
