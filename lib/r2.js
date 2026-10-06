import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

let client;

export function getR2Config() {
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (![endpoint, bucket, accessKeyId, secretAccessKey, publicUrl].every(Boolean)) {
    throw new Error('R2 environment variables are missing.');
  }
  return { endpoint: endpoint.replace(/\/$/, ''), bucket, accessKeyId, secretAccessKey, publicUrl: publicUrl.replace(/\/$/, '') };
}

export function r2Client() {
  if (!client) {
    const { endpoint, accessKeyId, secretAccessKey } = getR2Config();
    client = new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
  }
  return client;
}

export function objectKeyFromUrl(url) {
  const { publicUrl } = getR2Config();
  if (typeof url !== 'string' || !url.startsWith(`${publicUrl}/`)) return null;
  const key = url.slice(publicUrl.length + 1);
  try { return decodeURIComponent(key); } catch { return null; }
}

export async function deleteR2Object(url) {
  const key = objectKeyFromUrl(url);
  if (!key) return;
  const { bucket } = getR2Config();
  await r2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
