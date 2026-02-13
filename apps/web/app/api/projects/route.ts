import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { AuthSession } from "@/types/session";
import { prisma, Prisma } from "@repo/db";

export async function GET(request: NextRequest) {
    try {
        // Authenticate user
        const session = (await auth.api.getSession({
            headers: await headers(),
        })) as AuthSession | null;

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Extract query parameters
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const search = searchParams.get("search") || "";

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return NextResponse.json(
                { error: "Invalid pagination parameters" },
                { status: 400 }
            );
        }

        // Build where clause
        const where: Prisma.ProjectWhereInput = {
            userId: session.user.id,
            ...(search && {
                name: {
                    contains: search,
                    mode: "insensitive" as Prisma.QueryMode,
                },
            }),
        };

        // Fetch projects and total count in parallel
        const [projects, total] = await Promise.all([
            prisma.project.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.project.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            data: projects,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
