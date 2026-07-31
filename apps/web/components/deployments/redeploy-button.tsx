"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clientAxios } from "@/lib/axios-instance";

interface RedeployResponse {
  message: string;
  data: { id: string } | null;
}

/**
 * Queues a fresh build of the project's current branch and follows it to the
 * live log view.
 *
 * The API allows one in-flight deployment per project and answers 409 with the
 * build that's already running — treat that as "you're already there" and
 * navigate to it rather than surfacing an error.
 */
export function useRedeploy(projectId: string) {
  const router = useRouter();
  const [isRedeploying, setIsRedeploying] = useState(false);

  const redeploy = useCallback(async () => {
    setIsRedeploying(true);
    try {
      const response = await clientAxios.post<RedeployResponse>(
        `/projects/${projectId}/deployments`,
      );
      const deploymentId = response.data.data?.id;
      toast.success("Deployment queued");
      if (deploymentId) {
        router.push(`/projects/${projectId}/deployments/${deploymentId}`);
      }
      router.refresh();
    } catch (error) {
      const response = (
        error as {
          response?: { status?: number; data?: RedeployResponse };
        }
      ).response;

      if (response?.status === 409 && response.data?.data?.id) {
        toast.info("A deployment is already in progress");
        router.push(
          `/projects/${projectId}/deployments/${response.data.data.id}`,
        );
        return;
      }

      console.error("Failed to queue deployment", error);
      toast.error(response?.data?.message ?? "Failed to queue deployment");
    } finally {
      setIsRedeploying(false);
    }
  }, [projectId, router]);

  return { redeploy, isRedeploying };
}

interface RedeployButtonProps {
  projectId: string;
  /** `retry` just relabels the button after a failed build. */
  intent?: "redeploy" | "retry";
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}

export function RedeployButton({
  projectId,
  intent = "redeploy",
  variant = "outline",
  size = "default",
  className,
}: RedeployButtonProps) {
  const { redeploy, isRedeploying } = useRedeploy(projectId);
  const label = intent === "retry" ? "Retry deployment" : "Redeploy";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={redeploy}
      disabled={isRedeploying}
      aria-busy={isRedeploying}
    >
      {isRedeploying ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RotateCw className="mr-2 h-4 w-4" />
      )}
      {isRedeploying ? "Queueing…" : label}
    </Button>
  );
}
