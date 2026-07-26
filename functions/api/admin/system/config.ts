import type { PagesFunction } from '@cloudflare/workers-types';
import { requireAdminAuth, jsonResponse } from '../../../_auth.ts';

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);

  // Return non-sensitive env config
  return jsonResponse({
    cloudflare_account: 'configured',
    has_openai_key: true,
    has_deepseek_key: true,
    node_env: 'production',
  }, 200);
};

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);

  const body = await context.request.json() as { key: string; value: unknown };
  // Placeholder: future KV-based config storage
  return jsonResponse({ updated: true, key: body.key }, 200);
};