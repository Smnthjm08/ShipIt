import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const session = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // If user is authenticated AND tries to access /signin or /signup → redirect to /projects
  if (session && (pathname === "/signin" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  // If NOT authenticated and tries to access protected routes → redirect to /
  if (!session && pathname.startsWith("/projects")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/signin",
    "/signup",
    "/projects/:path*", // protect all project routes
  ],
};
