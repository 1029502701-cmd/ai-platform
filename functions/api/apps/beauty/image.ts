export const onRequestGet = async (context: any) => {
  try {
    const url = new URL(context.request.url);
    const key = url.searchParams.get('key');
    if (!key) return new Response('Missing key', { status: 400 });

    // Sanitize key - only allow safe characters
    if (!/^[a-zA-Z0-9_\-./]+$/.test(key)) return new Response('Invalid key', { status: 400 });

    // Use ASSETS_BUCKET directly — no non-existent beauty-images binding
    var bucket = context.env?.ASSETS_BUCKET;
    if (!bucket || typeof bucket.get !== 'function') {
      return new Response('No R2 bucket available', { status: 500 });
    }

    var obj = await bucket.get(key);
    if (!obj) return new Response('Not found', { status: 404 });

    // When R2 returns a ReadableStream
    if (obj.body && typeof obj.body.getReader === 'function') {
      const headers: Record<string, string> = {};
      const ct = obj.httpMetadata?.contentType || 'application/octet-stream';
      headers['Content-Type'] = ct;
      return new Response(obj.body, { status: 200, headers });
    }

    // Local fallback - Buffer or Uint8Array
    const data = obj.body instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj.body)) ? obj.body : Buffer.from(await obj.arrayBuffer());
    const headers: Record<string, string> = {};
    headers['Content-Type'] = obj.httpMetadata?.contentType || 'application/octet-stream';
    return new Response(data, { status: 200, headers });
  } catch (e: any) {
    return new Response('Server error', { status: 500 });
  }
};
