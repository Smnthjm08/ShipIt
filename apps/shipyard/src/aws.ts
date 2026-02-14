import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

const s3 = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  // endpoint: process.env.AWS_ENDPOINT!,
});

export const uploadFile = async (fileName: string, localFilePath: string) => {
  const fileContent = fs.readFileSync(localFilePath);
  const command = new PutObjectCommand({
    Body: fileContent,
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: fileName,
  });
  const response = await s3.send(command);
  console.log(response);
};
