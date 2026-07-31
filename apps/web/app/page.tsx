import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@repo/auth/server";
import LandingPage from "@/components/landing-page";

/**
 * `/` is the marketing page and nothing else. It used to render the project
 * grid for signed-in users too, which meant one URL doing two jobs — neither
 * could own its metadata, and the sidebar's "Projects" link pointed at what
 * reads like "Home".
 */
export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session?.user?.id) {
    redirect("/projects");
  }

  return <LandingPage />;
}
