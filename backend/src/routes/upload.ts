import { Router } from 'express';
import { put } from '@vercel/blob';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Response } from 'express';

const router = Router();

// POST /upload — upload a file to Vercel Blob
// Accepts multipart form-data with field "file"
// Returns { url } of the uploaded blob
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(503).json({ error: 'Blob storage not configured' });

  const contentType = req.headers['content-type'] || 'application/octet-stream';
  const filename = (req.headers['x-filename'] as string) || `upload-${Date.now()}`;
  const folder = (req.headers['x-folder'] as string) || 'uploads';

  // Stream the body directly to Vercel Blob
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', resolve);
    req.on('error', reject);
  });

  const buffer = Buffer.concat(chunks);
  if (buffer.length === 0) return res.status(400).json({ error: 'Empty file' });
  if (buffer.length > 10 * 1024 * 1024) return res.status(413).json({ error: 'File too large (max 10MB)' });

  const blob = await put(`${folder}/${Date.now()}-${filename}`, buffer, {
    access: 'public',
    contentType,
    token,
  });

  res.json({ url: blob.url, size: buffer.length });
});

export default router;
