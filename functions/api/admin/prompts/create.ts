import { createPromptInDB, createVersionInDB } from '../../../../shared/services/prompt_manager';
import { hasRoleForRequest } from '../../../../shared/services/permission';

export const onRequestPost = async (context: any) => {
  const { request } = context;
  const env = context.env;
  const isAdmin = await hasRoleForRequest('admin', { env, request }).catch(() => false);
  if (!isAdmin) return new Response(JSON.stringify({ success: false, error: 'UNAUTHORIZED' }), { status: 403 });

  const text = await request.text();
  const body = text ? JSON.parse(text) :{};
  if (!body.key) return new Response(JSON.stringify({ success: false, error: 'INVALID_PAYLOAD' }), { status: 400 });
  try {
    await createPromptInDB(context.env, { key: body.key, name: body.name, category: body.category, variables_schema: body.variables_schema, created_by: body.created_by });
    if (body.initial_version) {
      await createVersionInDB(context.env, { prompt_key: body.key, content: body.initial_version.content, variables: body.initial_version.variables, meta: body.initial_version.meta, created_by: body.created_by });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
