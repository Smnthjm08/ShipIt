import Docker from "dockerode";
import path from "path";
import { getAllFiles } from "./get-all-files";


export const docker = new Docker();

export const buildInContainer = async (deploymentId: string, cloneDir: string) => {
    await docker.ping();
    console.log("Docker connection established!");

    const absolutePath = path.resolve(cloneDir);
    console.log(`Mounting ${absolutePath} to /app`);

    console.log("Starting Build...");

    await new Promise((resolve, reject) => {
        docker.pull("node:20-alpine", (err, stream) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, resolve, reject);
        });
    });
    const container = await docker.createContainer({
        Image: "node:20-alpine",
        name: `deployment-${deploymentId}`,
        Tty: false,
        AttachStdout: true,
        AttachStderr: true,
        Cmd: ["/bin/sh", "-c", "npm install && npm run build"],
        HostConfig: {
            Binds: [`${absolutePath}:/app`],
            AutoRemove: true,
        },
        WorkingDir: "/app",
    });

    console.log(container.id);

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

        const distFolder = path.join(cloneDir, "dist");
        const allFiles = getAllFiles(distFolder);

        for (const file of allFiles) {
            const relativePath = file
                .slice(distFolder.length + 1)
                .replace(/\\/g, "/");

            // Your upload logic here
        }
    } else {
        console.error(`Build failed with status code: ${statusCode}`);
    }
};
