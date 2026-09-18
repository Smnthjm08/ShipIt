/**
 * Thrown when a build stops because the deployment was cancelled, rather than
 * because anything went wrong. The worker loop treats it as the expected end of
 * a cancelled build and leaves the CANCELLED status alone.
 */
export class DeploymentCancelled extends Error {
  constructor(message = "Deployment cancelled") {
    super(message);
    this.name = "DeploymentCancelled";
  }
}

/**
 * How a running build learns it has been cancelled.
 *
 * A cancellation arrives on a Redis channel at any moment, but there is only a
 * container to stop for part of a build — not while the repo is cloning, not
 * while the build image is pulling, and not after the build has exited. So the
 * worker both hands the build a way to be stopped (`onContainerStart`) and
 * records requests that land outside that window (`requested`), which the build
 * checks before each step that would otherwise carry a cancelled deployment
 * forward.
 */
export interface BuildCancellation {
  /** Called once the container exists, with a function that stops it. */
  onContainerStart(stop: () => Promise<void>): void;
  /** Whether a cancellation has been requested for the build in progress. */
  requested(): boolean;
}
