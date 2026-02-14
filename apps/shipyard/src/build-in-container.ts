import Docker from "dockerode";
import path from "path";
import fs from "fs";
import { getAllFiles } from "./get-all-files";
import { uploadFile } from "./aws";

export const docker = new Docker();

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

  // Pipe output to console
  stream.on("data", (chunk) => {
    const log = chunk.toString();
    console.log("Build log:", log);
  });

  // Start the container
  await container.start();

  // Wait for container to finish
  const result = await container.wait();
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
