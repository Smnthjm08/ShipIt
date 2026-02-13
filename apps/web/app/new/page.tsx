import { getServerAxios } from "@/lib/axios-instance";
import { RepoList } from "@/components/new/repo-list";
import { GitUrlInput } from "@/components/new/git-url-input";

interface NewProjectPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
  const { q } = await searchParams;
  const axiosInstance = await getServerAxios();
  const projects = await axiosInstance.get("/new", {
    params: {
      q,
    },
  });
  const data: [] = projects?.data?.data;

  return (
    <main className="flex flex-col justify-between py-6 px-12 gap-4 lg:px-24">
      <h1 className="text-2xl font-bold">Let&apos;s build something new</h1>

      <GitUrlInput />

      <h2 className="text-xl font-bold">Import from Git Repository</h2>

      <RepoList repos={Array.isArray(data) ? data : []} />
    </main>
  );
}
