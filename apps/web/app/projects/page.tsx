import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { auth } from "@repo/auth/server";
import type { AuthSession } from "@/types/session";
import Dashboard from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Projects · ShipIt",
};

/** The canonical project list — the home screen of the signed-in product. */
export default async function ProjectsPage() {
  const session = (await auth.api.getSession({
    headers: await headers(),
  })) as AuthSession | null;

  if (!session?.user?.id) {
    redirect("/connect-github");
  }

  return <Dashboard user={session.user} />;
}
