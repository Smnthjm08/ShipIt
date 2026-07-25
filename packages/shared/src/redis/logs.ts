import { redisPub } from "./publisher.js";
import { redisSub } from "./subscriber.js";

/** Pub/sub channel carrying live build output for one deployment. */
export const deploymentLogChannel = (deploymentId: string) =>
  `deployment:${deploymentId}:logs`;

export type DeploymentLogEvent = {
  deploymentId: string;
  /** Build output line, or a human-readable note for `status` events. */
  message: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Present when this event marks a deployment status transition. */
  status?: string;
  /** Signals the build is over and no further events will arrive. */
  done?: boolean;
};

export async function publishDeploymentLog(
  event: DeploymentLogEvent,
): Promise<void> {
  if (!redisPub.isOpen) return;
  try {
    await redisPub.publish(
      deploymentLogChannel(event.deploymentId),
      JSON.stringify(event),
    );
  } catch (e) {
    // Live streaming is best-effort; logs are still persisted to DeploymentLog.
    console.error("Failed to publish deployment log:", e);
  }
}

export async function subscribeDeploymentLogs(
  deploymentId: string,
  listener: (event: DeploymentLogEvent) => void,
): Promise<() => Promise<void>> {
  const channel = deploymentLogChannel(deploymentId);

  const handler = (message: string) => {
    try {
      listener(JSON.parse(message) as DeploymentLogEvent);
    } catch (e) {
      console.error("Malformed deployment log event:", e);
    }
  };

  await redisSub.subscribe(channel, handler);

  return async () => {
    try {
      await redisSub.unsubscribe(channel, handler);
    } catch (e) {
      console.error("Failed to unsubscribe from", channel, e);
    }
  };
}
