import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { prisma } from "@repo/db";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ deploymentId: string }> },
) {
  const { deploymentId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deployment = await prisma.deployment.findFirst({
      where: {
        id: deploymentId,
        project: {
          userId: session.user.id,
        },
      },
    });

    if (!deployment) {
      return NextResponse.json(
        { error: "Deployment not found or unauthorized" },
        { status: 404 },
      );
    }

    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete deployment:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
