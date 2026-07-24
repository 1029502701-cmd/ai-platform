import { loadPromptsFromBindings, getPromptFromMemory } from '../../../../shared/services/prompt_manager';
import { hasRoleForRequest } from '../../../../shared/services/permission';

export const onRequestGet = async (context: any) => {
  const { request } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) return new Response(JSON.stringify({ success: false, error: 'MISSING_KEY' }), { status: 400 });
  const isAdmin = await hasRoleForRequest('admin', { env: context.env, request }).catch(() => false);
  if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), { status: 403 });
  await loadPromptsFromBindings(context.env);
  const p = getPromptFromMemory(key);
  if (!p) return new Response(JSON.stringify({ success: false, error: 'PROMPT_NOT_FOUND' }), { status: 404 });
  // For simplicity, read versions from DB directly
  try {
    const db = context.env.DB;
    const res = await db.prepare('SELECT id, version, content, variables, meta, status, created_at FROM prompt_versions WHERE prompt_id = ? ORDER BY version DESC').all(p.id);
    return new Response(JSON.stringify({ success: true, data: res.results || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
