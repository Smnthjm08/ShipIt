import { S3Client } from "@aws-sdk/client-s3";

/**
 * Single source of truth for the S3 client used by both `shipyard` (uploads)
 * and `proxy` (reads). Keeping this in one place prevents the two ends from
 * drifting — e.g. uploading to real AWS while reading from an R2/MinIO endpoint.
 *
 * `AWS_ENDPOINT` opts into any S3-compatible service (Cloudflare R2, MinIO, …);
 * when it is set we force path-style addressing, which those services require.
 */
export const createS3Client = (): S3Client =>
  new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    ...(process.env.AWS_ENDPOINT
      ? { endpoint: process.env.AWS_ENDPOINT, forcePathStyle: true }
      : {}),
  });

/** Bucket name shared by uploads and reads. */
export const getBucketName = (): string => process.env.AWS_BUCKET_NAME!;
