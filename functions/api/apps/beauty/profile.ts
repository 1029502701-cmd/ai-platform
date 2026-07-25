import { readSessionId } from "../../../../shared/auth/cookies";
import { getSession } from "../../../../shared/auth/session";
import { BeautyRepository } from '../../../../database/beauty_repository';

export const onRequestGet = async (context: any) => {
  const { request, env } = context;
  try {
    const cookieHeader = request.headers.get('cookie') || null;
    const sessionId = readSessionId(cookieHeader);
    const session = sessionId ? await getSession(env, sessionId) : null;
    if (!session || !session.user?.id) {
      return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const repo = new BeautyRepository(env.DB);
    const profile = await repo.getProfile(session.user.id);
    return new Response(JSON.stringify({ success: true, data: profile }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: e?.message || 'Server error' } }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
