import { listPromptsFromMemory, loadPromptsFromBindings, getVersionFromMemory } from '../../../../shared/services/prompt_manager';
import { hasRoleForRequest } from '../../../../shared/services/permission';

export const onRequestGet = async (context: any) => {
  const { request } = context;
  const isAdmin = await hasRoleForRequest('admin', { env: context.env, request }).catch(() => false);
  if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), { status: 403 });
  await loadPromptsFromBindings(context.env);
  const list = listPromptsFromMemory();
  const out = list.map(p => {
    const ver = p.current_version_id ? getVersionFromMemory(p.current_version_id) : null;
    return { key: p.key, name: p.name, category: p.category, status: p.status, current_version: ver ? { id: ver.id, version: ver.version } : null };
  });
  return new Response(JSON.stringify({ success: true, data: out }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
