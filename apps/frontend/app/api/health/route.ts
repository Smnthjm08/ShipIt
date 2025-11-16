import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy!",
    env: process.env.ENV,
    envs: process.env.DATABASE_URL!,
  });
}
