import { getLogger } from "../logger";
import { PLATFORM_TENANT_KEY, DEFAULT_TENANT_KEY } from "./types.ts";

const log = getLogger("tenant_resolver");

export class TenantResolver {
  static resolve(request: Request): string {
    const header = request.headers.get('X-Tenant-ID');
    if (header && header !== 'null') return header;

    const url = new URL(request.url);
    const hostHeader = request.headers.get('Host') || url.hostname;
    const cleanHost = hostHeader.split(':')[0];
    const parts = cleanHost.split('.');

    if (parts.length >= 2) {
      const subdomain = parts[0];
      const known = ['www', 'api', 'app', 'admin', 'staging', 'dev', 'localhost'];
      if (!known.includes(subdomain.toLowerCase())) return subdomain;
    }

    return DEFAULT_TENANT_KEY;
  }

  static isValidKey(key: string): boolean {
    if (!key || key.length < 2 || key.length > 50) return false;
    return /^[a-zA-Z0-9_-]+$/.test(key);
  }

  static generateSlug(name: string): string {
    return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 30);
  }

  static generateSubdomain(key: string, parentDomain: string): string {
    return key + '.' + parentDomain;
  }
}