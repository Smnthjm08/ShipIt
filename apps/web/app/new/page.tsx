import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewProjectPage() {
  return (
    <main className="flex flex-col justify-between py-6 px-24 gap-4">
      <h1 className="text-2xl font-bold">Let&apos;s build something new</h1>

      <div className="flex gap-2">
        <Input placeholder="Enter a Git repository URL here..." />
        <Button>Continue</Button>
      </div>

      <h2 className="text-xl font-bold">Import from Git Repository</h2>
      <div className="flex gap-2">
        {/* here comes the git repos from octokit */}
      </div>
    </main>
  );
}
