import Docker from "dockerode";
import path from "path";
import fs from "fs";
import { prisma } from "@repo/db";
import { getAllFiles } from "./get-all-files";
import { uploadFile } from "./aws";

export const docker = new Docker();

// Hard ceiling on a single build so one hung build can't wedge the worker forever.
const BUILD_TIMEOUT_MS = Number(process.env.BUILD_TIMEOUT_MS) || 10 * 60 * 1000;

// Persist a build log line so it can be shown to the user (see DeploymentLog).
async function persistLog(deploymentId: string, message: string) {
  const trimmed = message.trim();
  if (!trimmed) return;
  try {
    await prisma.deploymentLog.create({
      data: { deploymentId, message: trimmed },
    });
  } catch (e) {
    console.error("Failed to persist deployment log:", e);
  }
}

function detectPackageManager(projectRoot: string): "npm" | "yarn" | "pnpm" {
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";
  return "npm";
}

export const buildInContainer = async (
  deploymentId: string,
  cloneDir: string,
  projectId: string,
  buildCommand: string,
  installCommand: string,
  rootDir: string,
  outputDir: string,
) => {
  await docker.ping();
  console.log("Docker connection established!");

  const absolutePath = path.resolve(cloneDir);
  console.log(`Mounting ${absolutePath} to /app`);

  const WORKDIR = path.join("/app", rootDir);
  console.log(`Working directory: ${WORKDIR}`);

  // detect package manager using the sub-directory if rootDir is specified
  const packageManager = detectPackageManager(path.join(absolutePath, rootDir));
  console.log(`Detected package manager: ${packageManager}`);

  let installCmd = installCommand;
  if (!installCmd || installCmd === "npm run install") {
    if (packageManager === "yarn") installCmd = "yarn install";
    else if (packageManager === "pnpm") installCmd = "pnpm install";
    else installCmd = "npm install";
  }

  let buildCmd = buildCommand;
  if (!buildCmd) {
    if (packageManager === "yarn") buildCmd = "yarn build";
    else if (packageManager === "pnpm") buildCmd = "pnpm build";
    else buildCmd = "npm run build";
  }

  const cmd = ["/bin/sh", "-c", `${installCmd} && ${buildCmd}`];
  console.log(`Executing command: ${cmd.join(" ")}`);

  console.log("Starting Build...");
  // Use node:20-alpine as base for now, can be dynamic later
  const image = "node:20-alpine";

  let imageExists = false;
  try {
    await docker.getImage(image).inspect();
    imageExists = true;
    console.log("Image exists locally");
  } catch (error) {
    console.log("Image does not exist locally, pulling...");
  }

  if (!imageExists) {
    await new Promise((resolve, reject) => {
      docker.pull(image, (err: any, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);
        docker.modem.followProgress(
          stream,
          (err, output) => {
            if (err) return reject(err);
            resolve(output);
          },
          (event) => {
            console.log(event.status);
          },
        );
      });
    });
  }

  const container = await docker.createContainer({
    Image: image,
    name: `deployment-${deploymentId}`,
    Tty: false,
    AttachStdout: true,
    AttachStderr: true,
    Cmd: cmd,
    HostConfig: {
      Binds: [`${absolutePath}:/app`],
      AutoRemove: true,
      // Resource caps so an untrusted build can't exhaust the host.
      Memory: 2 * 1024 * 1024 * 1024, // 2 GiB
      MemorySwap: 2 * 1024 * 1024 * 1024, // no extra swap beyond Memory
      NanoCpus: 2 * 1_000_000_000, // 2 CPUs
      PidsLimit: 512,
    },
    WorkingDir: WORKDIR,
  });

  console.log("Container created:", container.id);

  // Attach to container streams before starting
  const stream = await container.attach({
    stream: true,
    stdout: true,
    stderr: true,
  });

  // Pipe output to console and persist it for the user.
  stream.on("data", (chunk) => {
    const log = chunk.toString();
    console.log("Build log:", log);
    void persistLog(deploymentId, log);
  });

  // Start the container
  await container.start();

  // Wait for the container to finish, but stop it if it blows past the timeout.
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    console.error(`Build exceeded ${BUILD_TIMEOUT_MS}ms — stopping container`);
    void persistLog(
      deploymentId,
      `Build timed out after ${BUILD_TIMEOUT_MS / 1000}s`,
    );
    // AutoRemove cleans up once stopped; fall back to kill if stop fails.
    container.stop({ t: 0 }).catch(() => container.kill().catch(() => {}));
  }, BUILD_TIMEOUT_MS);

  let result;
  try {
    result = await container.wait();
  } finally {
    clearTimeout(timer);
  }

  if (timedOut) {
    throw new Error(`Build timed out after ${BUILD_TIMEOUT_MS / 1000}s`);
  }

  const statusCode = result.StatusCode;

  if (statusCode === 0) {
    console.log(`Build Success!`);

    const buildPath = path.join(cloneDir, rootDir);
    let distFolder = outputDir
      ? path.join(buildPath, outputDir)
      : path.join(buildPath, "dist");

    if (!fs.existsSync(distFolder) && !outputDir) {
      if (fs.existsSync(path.join(buildPath, ".next"))) {
        distFolder = path.join(buildPath, ".next");
      } else if (fs.existsSync(path.join(buildPath, "build"))) {
        distFolder = path.join(buildPath, "build");
      }
    }

    console.log(`Uploading artifacts from ${distFolder}...`);
    const allFiles = getAllFiles(distFolder);

    for (const file of allFiles) {
      const relativePath = path.relative(distFolder, file).replace(/\\/g, "/");
      const s3Key = `${deploymentId}/${relativePath}`;
      await uploadFile(s3Key, file);
    }
    console.log("Upload complete!");
  } else {
    console.error(`Build failed with status code: ${statusCode}`);
    throw new Error(`Build failed with status code: ${statusCode}`);
  }
};
