import type { D1Database, KVNamespace } from '@cloudflare/workers-types';
import type { AuthenticatedUser } from '../types';
import { getSession } from '../session';

export interface AuthEnvProxy {
  DB: D1Database;
  USER_CACHE: KVNamespace;
}

export interface APIContext {
  env: AuthEnvProxy;
  request: { headers: Headers };
}

export async function requireAuth(ctx: APIContext): Promise<{ user: AuthenticatedUser; env: AuthEnvProxy }> {
  const authHeader = ctx.request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }
  const token = authHeader.slice(7);
  const session = await getSession(ctx.env, token);
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return { user: session.user, env: ctx.env };
}
