import fs from 'fs';
import path from 'path';

export async function storeFile(env: any, bucketBindingName: string, key: string, body: ArrayBuffer | Uint8Array | Buffer, contentType?: string) {
  // Prefer Cloudflare R2 binding if available
  const bucket = env?.[bucketBindingName] || env?.ASSETS_BUCKET;
  if (bucket && typeof bucket.put === 'function') {
    // Workers R2 put accepts body as ArrayBuffer/ReadableStream/Blob
    // Use httpMetadata to store content type
    try {
      await bucket.put(key, body as any, { httpMetadata: { contentType: contentType || undefined } });
      // Return internal image route for serving
      return { key, url: `/api/apps/beauty/image?key=${encodeURIComponent(key)}` };
    } catch (e: any) {
      throw new Error('R2 upload failed: ' + (e?.message || e));
    }
  }

  // Local fallback (for tests / local development)
  const base = path.resolve(process.cwd(), 'tests', '_r2_emulator');
  const outPath = path.join(base, bucketBindingName || 'beauty-images', key);
  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body as any);
  fs.writeFileSync(outPath, buf);
  // Serve via same image route which will read from this local path when env binding absent
  return { key, url: `/api/apps/beauty/image?key=${encodeURIComponent(key)}` };
}

export async function getFile(env: any, bucketBindingName: string, key: string) {
  const bucket = env?.[bucketBindingName] || env?.ASSETS_BUCKET;
  if (bucket && typeof bucket.get === 'function') {
    // R2 get returns { body, size, httpMetadata }
    const obj = await bucket.get(key);
    return obj;
  }

  // Local fallback - read from tests/_r2_emulator
  const base = path.resolve(process.cwd(), 'tests', '_r2_emulator');
  const localPath = path.join(base, bucketBindingName || 'beauty-images', key);
  if (!fs.existsSync(localPath)) return null;
  const buf = fs.readFileSync(localPath);
  return {
    body: buf,
    size: buf.length,
    httpMetadata: { contentType: mimeTypeForKey(key) },
  } as any;
}

function mimeTypeForKey(key: string) {
  const ext = key.split('.').pop()?.toLowerCase();
  if (!ext) return 'application/octet-stream';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'application/octet-stream';
}
