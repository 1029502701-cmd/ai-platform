import { readSessionId } from '../../../../shared/auth/cookies.ts';
import { getSession } from '../../../../shared/auth/session.ts';
import { hasRoleForRequest } from '../../../../shared/services/permission.ts';
import { BeautyRepository } from "../../../../database/beauty_repository";

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const queryUserId = url.searchParams.get('userId') || null;

    // Admins can request other users' history
    const isAdmin = await hasRoleForRequest('admin', { env, request }).catch(() => false);

    const cookieHeader = request.headers.get('cookie') || null;
    const sessionId = readSessionId(cookieHeader);
    const session = sessionId ? await getSession(env, sessionId) : null;
    if (!session || !session.user?.id) {
      return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    let userId = session.user.id;
    if (queryUserId) {
      if (!isAdmin) return new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'admin only' } }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      userId = queryUserId;
    }

    const repo = new BeautyRepository(env.DB);
    const history = await repo.getHistory(userId, { limit, offset });
    return new Response(JSON.stringify({ success: true, data: history }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Server error' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
