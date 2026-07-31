"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { clientAxios } from "@/lib/axios-instance";
import { EnvVarEditor } from "@/components/forms/env-var-editor";
import { RedeployButton } from "@/components/deployments/redeploy-button";
import { relativeTime } from "@/lib/format";
import {
  findEnvVarError,
  toEnvVarPayload,
  type EnvVarRow,
} from "@/lib/env-vars";

interface EnvVarsFormProps {
  projectId: string;
  /** Drives the browser-prefix hint — only Vite and CRA inline variables. */
  framework?: string | null;
  /** Variables changed since the last deployment, so they aren't live yet. */
  isStale?: boolean;
}

/** Which prefix reaches browser code, per bundler. */
function browserPrefix(framework: string | null | undefined) {
  if (framework === "VITE") return "VITE_";
  if (framework === "REACT") return "REACT_APP_";
  return null;
}

interface EnvVarSummary {
  id: string;
  key: string;
  updatedAt: string;
}

/**
 * Values are write-only: the API returns keys only, so stored rows start with
 * an empty field that means "keep the current value". Changes apply to the
 * next build, not the running deployment.
 */
export function EnvVarsForm({
  projectId,
  framework,
  isStale = false,
}: EnvVarsFormProps) {
  const [rows, setRows] = useState<EnvVarRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const prefix = browserPrefix(framework);
  // Either the server says they're stale, or this session just saved.
  const needsRedeploy = isStale || savedAt !== null;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await clientAxios.get<{ data: EnvVarSummary[] }>(
        `/projects/${projectId}/env`,
      );
      setRows(
        response.data.data.map((v) => ({
          key: v.key,
          value: "",
          stored: true,
        })),
      );
    } catch (err) {
      console.error("Failed to load environment variables", err);
      setError("Couldn't load environment variables.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = findEnvVarError(rows);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      const response = await clientAxios.put<{ data: EnvVarSummary[] }>(
        `/projects/${projectId}/env`,
        { envVars: toEnvVarPayload(rows) },
      );
      setRows(
        response.data.data.map((v) => ({
          key: v.key,
          value: "",
          stored: true,
        })),
      );
      setSavedAt(new Date());
      toast.success("Environment variables saved. Redeploy to apply them.");
    } catch (err) {
      console.error("Failed to save environment variables", err);
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Failed to save environment variables";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <Card>
        <CardHeader>
          <CardTitle>Variables</CardTitle>
          <CardDescription>
            Encrypted at rest and hidden once saved — replace a value by typing
            a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsRedeploy && !isLoading && !error && (
            <div className="border-warning/40 bg-warning/10 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
              <p className="text-xs">
                {savedAt
                  ? `Saved ${relativeTime(savedAt)} — not live yet.`
                  : "These variables changed after the last deployment."}{" "}
                A build has to run before they reach your site.
              </p>
              <RedeployButton projectId={projectId} size="sm" />
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle aria-hidden />
              <AlertTitle>Couldn&apos;t load variables</AlertTitle>
              <AlertDescription>
                <p>{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={load}
                >
                  <RefreshCw aria-hidden />
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <EnvVarEditor
                rows={rows}
                onChange={setRows}
                disabled={isSaving}
              />
              <div className="text-muted-foreground space-y-2 text-xs">
                {prefix && (
                  <p>
                    Only variables prefixed{" "}
                    <code className="font-machine">{prefix}</code> reach browser
                    code in this project. Others are available to the build
                    itself but not to the shipped bundle.
                  </p>
                )}
                <p>
                  Build-time values are baked into static output and readable by
                  anyone who visits the site — keep server-side secrets out of
                  here.
                </p>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={isSaving || isLoading || !!error}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Variables
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
