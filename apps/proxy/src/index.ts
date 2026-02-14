import express from "express";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@repo/db";
import mime from "mime-types";

const app = express();
const PORT = 8001;

const s3 = new S3Client({
    region: "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    ...(process.env.AWS_ENDPOINT ? { endpoint: process.env.AWS_ENDPOINT } : {}),
});

app.use(async (req, res) => {
    const hostname = req.hostname;
    const subdomain = hostname.split(".")[0];

    // For local development, we might use project-id.localhost
    // If no subdomain, or 'www', return 404 or landing
    if (!subdomain || subdomain === "www" || subdomain === "localhost") {
        return res.status(404).send("Not found");
    }

    try {
        // First, check if the subdomain is a valid deployment ID
        let deployment = await prisma.deployment.findUnique({
            where: {
                id: subdomain,
            },
        });

        // If not a deployment ID, check if it's a project ID and get the latest completed deployment
        if (!deployment) {
            deployment = await prisma.deployment.findFirst({
                where: {
                    projectId: subdomain,
                    status: "COMPLETED",
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
        }

        if (!deployment) {
            return res.status(404).send("<html><head><title>Deployment not found</title></head><body><h1>Deployment not found</h1><p>If you think this is a mistake, please contact the owner of the project.</p></body></html>");
        }

        // Resolve path
        let filePath = req.path;
        if (filePath === "/") {
            filePath = "/index.html";
        }

        const s3Key = `${deployment.id}${filePath}`;

        // Check content type
        const type = mime.lookup(filePath) || "application/octet-stream";

        try {
            const command = new GetObjectCommand({
                Bucket: process.env.AWS_BUCKET_NAME!,
                Key: s3Key,
            });
            const response = await s3.send(command);

            if (response.Body) {
                res.set("Content-Type", type);
                // @ts-ignore - response.Body is a stream in node
                response.Body.pipe(res);
            } else {
                res.status(404).send("File not found");
            }

        } catch (e) {
            // Fallback to index.html for SPA routing if 404?
            // Usually serving index.html for unknown routes is good for SPAs.
            // Let's implement that fallback.
            if (filePath !== "/index.html") {
                const indexKey = `${deployment.id}/index.html`;
                try {
                    const command = new GetObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME!,
                        Key: indexKey,
                    });
                    const response = await s3.send(command);
                    if (response.Body) {
                        res.set("Content-Type", "text/html");
                        // @ts-ignore
                        response.Body.pipe(res);
                        return;
                    }
                } catch (e2) {
                    console.error("Fallback index.html not found", e2);
                }
            }
            res.status(404).send("Not found");
        }

    } catch (error) {
        console.error("Error serving request:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
