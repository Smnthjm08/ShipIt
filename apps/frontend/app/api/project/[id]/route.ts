import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const projectId = params.id;

    return NextResponse.json({
      status: "healthy!",
      projectId,
      env: process.env.ENV,
    });
  } catch (error) {
    console.error("Error in health check:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
