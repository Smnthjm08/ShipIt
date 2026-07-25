import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@repo/auth/server";
import { prisma } from "@repo/db";
import {
  connectRedis,
  subscribeDeploymentLogs,
  type DeploymentLogEvent,
} from "@repo/shared";

const PORT = Number(process.env.WS_PORT) || 3003;

/**
 * Clients connect to `ws://host:PORT/deployments/<deploymentId>/logs` and get
 * the persisted backlog followed by live lines published by the Shipyard worker.
 */
const DEPLOYMENT_PATH = /^\/deployments\/([A-Za-z0-9_-]+)\/logs$/;

function parseDeploymentId(url: string | undefined): string | null {
  if (!url) return null;
  const { pathname, searchParams } = new URL(url, "http://localhost");
  const match = DEPLOYMENT_PATH.exec(pathname);
  if (match) return match[1]!;
  // Also accept /logs?deploymentId=... for convenience.
  return searchParams.get("deploymentId");
}

/** Resolve the session and confirm the deployment belongs to that user. */
async function authorize(req: http.IncomingMessage, deploymentId: string) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session?.user?.id) return null;

  return prisma.deployment.findFirst({
    where: {
      id: deploymentId,
      isDeleted: false,
      project: { userId: session.user.id, isDeleted: false },
    },
  });
}

function send(socket: WebSocket, event: DeploymentLogEvent) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

async function main() {
  await connectRedis();
  console.log("Redis connected");

  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "OK" }));
      return;
    }
    res.writeHead(404).end();
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    const deploymentId = parseDeploymentId(req.url);

    if (!deploymentId) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      const deployment = await authorize(req, deploymentId);
      if (!deployment) {
        // Same response for "not yours" and "doesn't exist" — don't leak which.
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req, deployment);
      });
    } catch (error) {
      console.error("Upgrade failed:", error);
      socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      socket.destroy();
    }
  });

  wss.on(
    "connection",
    async (
      ws: WebSocket,
      _req: http.IncomingMessage,
      deployment: { id: string; status: string },
    ) => {
      const { id: deploymentId } = deployment;
      console.log("Client watching deployment", deploymentId);

      // Subscribe before replaying history so no line is lost in the gap.
      let unsubscribe: (() => Promise<void>) | null = null;
      let lastReplayedAt = 0;

      try {
        unsubscribe = await subscribeDeploymentLogs(deploymentId, (event) => {
          // Skip anything already covered by the backlog we send below.
          if (new Date(event.timestamp).getTime() <= lastReplayedAt) return;
          send(ws, event);
          if (event.done) ws.close(1000, "deployment finished");
        });

        const backlog = await prisma.deploymentLog.findMany({
          where: { deploymentId, isDeleted: false },
          orderBy: { timestamp: "asc" },
          take: 1000,
        });

        for (const log of backlog) {
          lastReplayedAt = Math.max(lastReplayedAt, log.timestamp.getTime());
          send(ws, {
            deploymentId,
            message: log.message,
            timestamp: log.timestamp.toISOString(),
          });
        }

        // If the build already finished there is nothing left to stream.
        const current = await prisma.deployment.findUnique({
          where: { id: deploymentId },
          select: { status: true },
        });
        if (current?.status === "COMPLETED" || current?.status === "FAILED") {
          send(ws, {
            deploymentId,
            message: `Deployment ${current.status.toLowerCase()}`,
            timestamp: new Date().toISOString(),
            status: current.status,
            done: true,
          });
          ws.close(1000, "deployment finished");
        }
      } catch (error) {
        console.error("Failed to start log stream:", error);
        ws.close(1011, "failed to start log stream");
      }

      ws.on("close", () => {
        console.log("Client stopped watching", deploymentId);
        void unsubscribe?.();
      });

      ws.on("error", (err) => console.error("Socket error:", err));
    },
  );

  server.listen(PORT, () => {
    console.log(`WebSocket server listening on ws://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("ws-server failed to start:", err);
  process.exit(1);
});
