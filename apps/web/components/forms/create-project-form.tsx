import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { clientAxios } from "@/lib/axios-instance";
import { toast } from "sonner";

export default function CreateNewProjectForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const repoUrl = searchParams.get("url");
  const branch = searchParams.get("branch") ?? "main";

  const [framework, setFramework] = useState<
    "NONE" | "NEXTJS" | "REACT" | "VITE" | "NODE"
  >("NONE");
  const [buildCommand, setBuildCommand] = useState<string>("");
  const [outputDir, setOutputDir] = useState<string>("");

  useEffect(() => {
    switch (framework) {
      case "NEXTJS":
        setBuildCommand("npm run build");
        // Static export only — see the notice below.
        setOutputDir("out");
        break;
      case "REACT":
        setBuildCommand("npm run build");
        setOutputDir("build");
        break;
      case "VITE":
        setBuildCommand("npm run build");
        setOutputDir("dist");
        break;
      case "NODE":
        setBuildCommand("");
        setOutputDir("");
        break;
      default:
        setBuildCommand("");
        setOutputDir("");
    }
  }, [framework]);

  // Bail out after the hooks so they run in the same order on every render.
  if (!owner || !repo || !repoUrl) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl text-muted-foreground">
          Invalid GitHub import link
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    try {
      e.preventDefault();

      const response = await clientAxios.post("/new", {
        name: repo,
        repoUrl: repoUrl,
        project: repo, // controller expects `project`, form has `repo`
        owner: owner,
        branch: branch,
        framework: framework,
        buildCommand: buildCommand,
        installCommand: (e.target as any).installCommand.value,
        rootDir: (e.target as any).rootDir.value,
        outputDir: (e.target as any).outputDir.value,
      });

      if (response.status === 201) {
        toast.success("Project created successfully");
        const projectId = response.data.data.id;
        const deploymentId = response.data.res.id;
        router.push(`/projects/${projectId}/deployments/${deploymentId}`);
      }
    } catch (error) {
      console.log("Error creating project", error);
    }
  };

  return (
    <div className="flex flex-1 justify-center text-start">
      <div className="w-full max-w-md px-6 py-12 h-fit">
        <form className="space-y-3" onSubmit={handleSubmit}>
          <FieldSet>
            <FieldLegend>
              <span className="text-2xl font-bold">New Project</span>
            </FieldLegend>
            <FieldDescription className="text-muted-foreground">
              Import your project from GitHub
            </FieldDescription>

            <FieldSet>
              <FieldLegend>{owner}</FieldLegend>
              <FieldDescription>
                <Link
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <span className="font-medium">{repo}</span>
                  <span className="flex items-center gap-2 text-xs">
                    <GitBranch size={14} />
                    {branch}
                  </span>
                </Link>
              </FieldDescription>
            </FieldSet>

            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Project Name</FieldLabel>
                  <Input
                    name="name"
                    required
                    defaultValue={repo}
                    placeholder="My Awesome App"
                  />
                </Field>

                <Field>
                  <FieldLabel>Framework</FieldLabel>
                  <Select
                    name="framework"
                    value={framework}
                    onValueChange={(value) => {
                      if (!value) return;
                      setFramework(value as typeof framework);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select framework" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Auto detect</SelectItem>
                      <SelectItem value="NEXTJS">Next.js</SelectItem>
                      <SelectItem value="REACT">React</SelectItem>
                      <SelectItem value="VITE">Vite</SelectItem>
                      <SelectItem value="NODE">Node.js</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {framework === "NEXTJS" && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                  ShipIt serves static files, so it can&apos;t run a Next.js
                  server. Set{" "}
                  <code className="font-mono">output: &quot;export&quot;</code>{" "}
                  in <code className="font-mono">next.config.js</code> — the
                  build then emits <code className="font-mono">out/</code>,
                  which deploys fine. Server components, API routes, ISR and
                  image optimisation won&apos;t work.
                </div>
              )}

              {framework === "NODE" && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                  ShipIt has no Node runtime yet — it only serves static files
                  from S3. A plain Node.js server won&apos;t be reachable after
                  deploying.
                </div>
              )}

              <Field>
                <FieldLabel>Build Command</FieldLabel>
                <Input
                  name="buildCommand"
                  placeholder="npm run build"
                  value={buildCommand}
                  onChange={(e) => setBuildCommand(e.target.value)}
                />
                <FieldDescription>
                  Leave empty if no build step is required.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Install Command</FieldLabel>
                <Input
                  name="installCommand"
                  defaultValue="npm install"
                  placeholder="npm install"
                />
              </Field>

              <Field>
                <FieldLabel>Root Directory</FieldLabel>
                <Input name="rootDir" defaultValue="./" placeholder="./" />
                <FieldDescription>
                  Path to project root relative to repository.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Output Directory</FieldLabel>
                <Input
                  name="outputDir"
                  placeholder="dist"
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                />
                <FieldDescription>
                  Directory of static files to serve (e.g. dist, build, out).
                  Leave empty to auto-detect.
                </FieldDescription>
              </Field>
            </FieldGroup>

            <input type="hidden" name="owner" value={owner} />
            <input type="hidden" name="repoName" value={repo} />
            <input type="hidden" name="branch" value={branch} />
          </FieldSet>

          <Button type="submit">Create Project</Button>
        </form>
      </div>
    </div>
  );
}
