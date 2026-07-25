import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RepoList } from "@/components/new/repo-list";
import { GitUrlInput } from "@/components/new/git-url-input";

interface NewProjectPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const { q } = await searchParams;
  const headersList = await headers();
  const cookie = headersList.get("cookie") ?? "";

  // NEXT_PUBLIC_API_BASE_URL already includes the /api/v1 prefix — see .env.
  // A leading slash here (`new URL("/new", baseURL)`) would discard that
  // prefix entirely, since the WHATWG URL spec resolves a path starting
  // with "/" against the origin root rather than the base's own path.
  const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/new`);
  if (q) url.searchParams.set("q", String(q));

  const res = await fetch(url.toString(), {
    headers: { cookie },
    credentials: "include",
  });

  const json = res.ok ? await res.json() : { data: [] };
  const data: [] = json?.data;

  return (
    <main className="flex flex-col justify-between py-6 px-12 gap-4 lg:px-24">
      <Button variant="ghost" size="sm" asChild className="w-fit gap-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">Let&apos;s build something new</h1>

      <GitUrlInput />

      <h2 className="text-xl font-bold">Import from Git Repository</h2>

      <RepoList repos={Array.isArray(data) ? data : []} />
    </main>
  );
}
