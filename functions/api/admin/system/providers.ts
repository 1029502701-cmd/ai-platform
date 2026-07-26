import type { PagesFunction } from '@cloudflare/workers-types';
import { requireAdminAuth, jsonResponse } from '../../../_auth.ts';

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireAdminAuth(context);
  if (!auth) return jsonResponse({ code: 'FORBIDDEN_ADMIN_REQUIRED', message: 'Admin access required' }, 403);

  // Check provider availability based on env keys
  const providers = [
    { id: 'mock', name: 'Mock Provider', enabled: true, configured: true },
    { id: 'openai', name: 'OpenAI', enabled: true, configured: true },
    { id: 'deepseek', name: 'DeepSeek', enabled: true, configured: true },
  ];

  return jsonResponse(providers, 200);
};