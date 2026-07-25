
export async function storeFile(env: any, bucketBindingName: string, key: string, body: ArrayBuffer | Uint8Array | Buffer, contentType?: string): Promise<{ key: string; url: string }> {
  const bucket = env?.[bucketBindingName] || env?.ASSETS_BUCKET;
  if (bucket && typeof bucket.put === "function") {
    try {
      await bucket.put(key, body as any, { httpMetadata: { contentType: contentType || undefined } });
      return { key, url: "/api/apps/beauty/image?key=" + encodeURIComponent(key) };
    } catch (e: any) {
      throw new Error("R2 upload failed: " + (e?.message || e));
    }
  }
  throw new Error("No R2 binding available for bucket: " + bucketBindingName);
}

export async function getFile(env: any, bucketBindingName: string, key: string): Promise<any> {
  const bucket = env?.[bucketBindingName] || env?.ASSETS_BUCKET;
  if (bucket && typeof bucket.get === "function") {
    return await bucket.get(key);
  }
  return null;
}
