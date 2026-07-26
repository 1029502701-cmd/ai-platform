import { getLogger } from "../logger";

const log = getLogger("file_storage");

/**
 * Unified File Storage Service 鈥?manages uploads/downloads via R2 or D1.
 */
export class FileStorageService {
  static async upload(env: any, params: {
    userId: number;
    tenantId: number;
    filename: string;
    mimeType: string;
    data: ArrayBuffer | Blob;
    ttlDays?: number;
  }): Promise<{ success: boolean; key?: string; url?: string; error?: string }> {
    const bucket = env?.ASSETS_BUCKET;
    if (!bucket) return { success: false, error: 'No storage bucket configured' };

    try {
      const key = `${params.tenantId || 1}/${params.userId}/files/${Date.now()}-${params.filename}`;

      // Write to R2
      await bucket.put(key, params.data, {
        httpMetadata: { contentType: params.mimeType },
      });

      // Store metadata in D1
      const db = env.DB;
      if (db?.prepare) {
        await db.prepare(
          "INSERT INTO file_storage (tenant_id, user_id, key, filename, mime_type, size, url, storage_type) VALUES (?, ?, ?, ?, ?, ?, ?, 'r2')"
        ).run(params.tenantId, params.userId, key, params.filename, params.mimeType, (params.data instanceof ArrayBuffer ? params.data.byteLength : (params.data as any).size || 0), `https://${key}`);
      }

      const ttlDays = params.ttlDays || 30;
      /* const expiresAt = */ new Date(Date.now() + ttlDays * 86400000).toISOString();
      log.info("File uploaded", { key, size: params.data.byteLength });

      // Generate presigned URL for R2
      const obj = await bucket.get(key);
      const presignedUrl = obj ? await obj.pipe.toUrl() : '';

      return { success: true, key, url: presignedUrl || `https://ai-platform.com/files/${key}` };
    } catch (e: any) {
      log.error("Upload failed", { error: e.message });
      return { success: false, error: e.message };
    }
  }

  static async download(env: any, key: string): Promise<{ success: boolean; data?: Blob; headers?: Record<string, string>; error?: string }> {
    const bucket = env?.ASSETS_BUCKET;
    if (!bucket) return { success: false, error: 'No storage bucket configured' };

    try {
      const obj = await bucket.get(key);
      if (!obj) return { success: false, error: 'File not found' };
      const blob = await obj.arrayBuffer();
      return { success: true, data: new Blob([blob]), headers: { 'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream' } };
    } catch (e: any) {
      log.error("Download failed", { key, error: e.message });
      return { success: false, error: e.message };
    }
  }

  static async delete(env: any, key: string): Promise<boolean> {
    const bucket = env?.ASSETS_BUCKET;
    if (bucket) { try { await bucket.delete(key); } catch {} }
    const db = env?.DB;
    if (db?.prepare) { await db.prepare("UPDATE file_storage SET deleted_at = datetime('now') WHERE key = ?").bind(key).run(); }
    return true;
  }

  static async list(env: any, userId?: number, limit = 50): Promise<Array<{ key: string; filename: string; size: number; url: string; uploaded_at: string }>> {
    const db = env?.DB;
    if (!db?.prepare) return [];
    const rows: any[] = userId
      ? await db.prepare("SELECT key, filename, size, url, uploaded_at FROM file_storage WHERE user_id = ? AND deleted_at IS NULL ORDER BY uploaded_at DESC LIMIT ?").bind(userId, limit).all()
      : await db.prepare("SELECT key, filename, size, url, uploaded_at FROM file_storage WHERE deleted_at IS NULL ORDER BY uploaded_at DESC LIMIT ?").bind(limit).all();
    return rows || [];
  }
}
