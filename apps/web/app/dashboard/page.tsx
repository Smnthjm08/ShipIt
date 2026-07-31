import { redirect } from "next/navigation";

/**
 * There is no dashboard yet. Sending people to the project list is a more
 * honest answer than a "coming soon" placeholder sitting in the primary nav —
 * the route stays so existing links and bookmarks keep working.
 */
export default function DashboardPage() {
  redirect("/projects");
}
