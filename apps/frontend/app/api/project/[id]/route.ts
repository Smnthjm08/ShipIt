import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy!",
    statsus: "healthy!",
    statssus: "healthy!",
    statusss: "healthy!",
    env: process.env.ENV,
  });
}
