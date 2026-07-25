"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface LogLine {
  id: string;
  message: string;
  timestamp: string;
}

interface DeploymentLogsProps {
  deploymentId: string;
  initialLogs: LogLine[];
  initialStatus: string;
}

const TERMINAL_STATUSES = ["COMPLETED", "FAILED"];

const statusVariant = (status: string) =>
  status === "COMPLETED"
    ? "default"
    : status === "FAILED"
      ? "destructive"
      : "secondary";

/**
 * Streams build output from ws-server. If the socket can't be established the
 * component falls back to polling the backend's logs endpoint, so logs still
 * show up when ws-server isn't running.
 */
export function DeploymentLogs({
  deploymentId,
  initialLogs,
  initialStatus,
}: DeploymentLogsProps) {
  const [logs, setLogs] = useState<LogLine[]>(initialLogs);
  const [status, setStatus] = useState(initialStatus);
  const [connection, setConnection] = useState<"live" | "polling" | "closed">(
    TERMINAL_STATUSES.includes(initialStatus) ? "closed" : "live",
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);
  // Latest logs, readable from the poller without re-running the stream effect.
  const logsRef = useRef(logs);
  logsRef.current = logs;

  useEffect(() => {
    if (TERMINAL_STATUSES.includes(status)) return;

    let socket: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let finished = false;

    const appendLine = (message: string, timestamp: string) => {
      setLogs((prev) => {
        const last = prev[prev.length - 1];
        // The socket replays history on connect — don't duplicate what we have.
        if (last && last.timestamp >= timestamp && last.message === message) {
          return prev;
        }
        return [
          ...prev,
          { id: `${timestamp}-${prev.length}`, message, timestamp },
        ];
      });
    };

    const startPolling = () => {
      if (cancelled || finished || pollTimer) return;
      setConnection("polling");

      const poll = async () => {
        try {
          const after = logsRef.current.at(-1)?.timestamp;
          // NEXT_PUBLIC_API_BASE_URL already includes the /api/v1 prefix — see
          // lib/axios-instance.ts, whose callers request bare "/new".
          const url = new URL(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/deployments/${deploymentId}/logs`,
          );
          if (after) url.searchParams.set("after", after);

          const res = await fetch(url, { credentials: "include" });
          if (!res.ok) return;

          const body = await res.json();
          for (const log of body.data.logs as {
            message: string;
            timestamp: string;
          }[]) {
            appendLine(log.message, log.timestamp);
          }
          setStatus(body.data.status);
          if (TERMINAL_STATUSES.includes(body.data.status)) {
            finished = true;
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = null;
            setConnection("closed");
          }
        } catch (e) {
          console.error("Failed to poll deployment logs", e);
        }
      };

      void poll();
      pollTimer = setInterval(poll, 3000);
    };

    try {
      const base = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3003";
      socket = new WebSocket(`${base}/deployments/${deploymentId}/logs`);

      socket.onopen = () => setConnection("live");

      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data) as {
          message: string;
          timestamp: string;
          status?: string;
          done?: boolean;
        };
        appendLine(payload.message, payload.timestamp);
        if (payload.status) setStatus(payload.status);
        if (payload.done) {
          finished = true;
          setConnection("closed");
        }
      };

      socket.onerror = () => socket?.close();

      socket.onclose = () => {
        if (cancelled || finished) return;
        // We lost the stream before the build ended — keep showing output by
        // polling the REST endpoint instead.
        startPolling();
      };
    } catch (e) {
      console.error("Failed to open log socket", e);
      startPolling();
    }

    return () => {
      cancelled = true;
      socket?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
    // Re-subscribing on every log line would tear down the socket constantly —
    // this effect only depends on which deployment we're watching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploymentId]);

  useEffect(() => {
    if (autoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Build logs</span>
          <Badge variant={statusVariant(status)}>{status}</Badge>
        </div>
        <span className="text-muted-foreground flex items-center gap-2 text-xs">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connection === "live"
                ? "bg-green-500"
                : connection === "polling"
                  ? "bg-amber-500"
                  : "bg-muted-foreground",
            )}
          />
          {connection === "live"
            ? "Streaming"
            : connection === "polling"
              ? "Polling"
              : "Finished"}
        </span>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="bg-muted/40 max-h-[60vh] overflow-auto p-4 font-mono text-xs leading-relaxed"
      >
        {logs.length === 0 ? (
          <p className="text-muted-foreground">
            No logs yet. Output appears here as the build runs.
          </p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-3">
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="whitespace-pre-wrap break-all">
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
