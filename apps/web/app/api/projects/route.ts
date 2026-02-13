import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { AuthSession } from "@/types/session";
import { prisma, Prisma } from "@repo/db";

export async function GET(request: NextRequest) {
  try {
    const session = (await auth.api.getSession({
      headers: await headers(),
    })) as AuthSession | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "6", 10);
    const search = searchParams.get("search") || "";

    const where: Prisma.ProjectWhereInput = {
      userId: session.user.id,
      ...(search && {
        name: {
          contains: search,
          mode: "insensitive",
        },
      }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
