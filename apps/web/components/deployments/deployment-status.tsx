import { cn } from "@/lib/utils";
import { statusMeta, type StatusTone } from "@/lib/deployment-status";

const DOT_TONE: Record<StatusTone, string> = {
  success: "bg-success",
  error: "bg-destructive",
  active: "bg-warning",
  idle: "bg-muted-foreground",
};

const TEXT_TONE: Record<StatusTone, string> = {
  success: "text-success",
  error: "text-destructive",
  active: "text-warning",
  idle: "text-muted-foreground",
};

/**
 * The status dot on its own — for tight surfaces like the sidebar.
 *
 * Colour alone can't carry meaning (colour-blind users, greyscale displays), so
 * every dot ships with a screen-reader label and is paired with visible text
 * wherever there's room.
 */
export function StatusDot({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}) {
  const meta = statusMeta(status);

  return (
    <span className={cn("relative flex size-2 shrink-0", className)}>
      {meta.isLive && (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60",
            DOT_TONE[meta.tone],
          )}
          aria-hidden
        />
      )}
      <span
        className={cn(
          "relative inline-flex size-2 rounded-full",
          DOT_TONE[meta.tone],
        )}
        aria-hidden
      />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

/**
 * Dot plus label. This is the canonical way to render a deployment status —
 * import it rather than mapping the enum again.
 */
export function DeploymentStatus({
  status,
  className,
  size = "default",
}: {
  status: string | null | undefined;
  className?: string;
  size?: "default" | "sm";
}) {
  const meta = statusMeta(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-medium",
        size === "sm" ? "text-xs" : "text-sm",
        TEXT_TONE[meta.tone],
        className,
      )}
    >
      <StatusDot status={status} />
      {meta.label}
    </span>
  );
}
