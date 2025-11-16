import prisma from "@workspace/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  const user = await prisma.user.findMany();
  console.log("user", user);

  return NextResponse.json({
    status: "healthy!",
    env: process.env.ENV,
    envs: process.env.DATABASE_URL!,
  });
}
