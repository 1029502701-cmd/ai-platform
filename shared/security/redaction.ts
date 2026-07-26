import { redactFields, SENSITIVE_PATTERNS } from "./types.ts";
export { redactFields, SENSITIVE_PATTERNS };

/**
 * Utility for sanitizing log output before writing.
 */
export function sanitizeForLog(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    const masked = obj
      .replace(/(sk-[a-zA-Z0-9]{10})[a-zA-Z0-9]+/g, '$1****')
      .replace(/(Bearer )([a-zA-Z0-9._-]{10})/g, '$1****')
      .replace(/(password=)[^&]+/g, '$1****')
      .replace(/(token=)[^&]+/g, '$1****');
    return masked.length > 200 ? masked.substring(0, 200) + '...' : masked;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLog(item));
  }
  if (typeof obj === 'object') {
    return redactFields(obj as Record<string, any>);
  }
  return obj;
}

export function getRedactedMetadata(metadata: Record<string, any>): Record<string, any> {
  return redactFields(metadata);
}