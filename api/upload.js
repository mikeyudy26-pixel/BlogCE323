import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireRole } from '../lib/session.js';
import { getR2Config, r2Client } from '../lib/r2.js';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!requireRole(req, ['student', 'admin'])) return res.status(401).json({ error: 'Entre para enviar arquivos.' });
  try {
    const { type, contentType, size } = req.body || {};
    const allowedTypes = type === 'video' ? VIDEO_TYPES : type === 'image' ? IMAGE_TYPES : null;
    const maxSize = type === 'video' ? 500 * 1024 * 1024 : 5 * 1024 * 1024;
    if (!allowedTypes || !allowedTypes.has(contentType) || !Number.isSafeInteger(size) || size <= 0 || size > maxSize) {
      return res.status(400).json({ error: 'Tipo ou tamanho de arquivo inválido.' });
    }
    const { bucket, publicUrl } = getR2Config();
    const extension = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1].replace('quicktime', 'mov');
    const key = `posts/${randomUUID()}.${extension}`;
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size });
    const uploadUrl = await getSignedUrl(r2Client(), command, { expiresIn: 900 });
    return res.status(200).json({ uploadUrl, fileUrl: `${publicUrl}/${key}` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível preparar o envio para o armazenamento.' });
  }
}
