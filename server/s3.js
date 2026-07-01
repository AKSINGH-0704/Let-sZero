import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAwsRegion } from "./awsConfig.js";
import crypto from "crypto";

const s3 = new S3Client({
  region: getAwsRegion(),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME;

export async function uploadFile(buffer, originalName, mimeType) {
  const ext = originalName.split(".").pop();
  const key = `uploads/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType || "application/octet-stream",
    Metadata: { originalName },
  }));

  return key;
}

export async function getSignedDownloadUrl(key, expiresInSeconds = 3600) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
