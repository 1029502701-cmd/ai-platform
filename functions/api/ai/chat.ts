import { generateViaCore } from '../../../shared/services/ai_core';
import { getSession } from '../../../shared/auth/session';
import { readSessionId } from '../../../shared/auth/cookies';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;
  const text = await request.text();
  const body = text ? JSON.parse(text) : {};

  // Extract token from Authorization or x-guest-token or cookie
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  let token: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.slice(7);
  if (!token) token = request.headers.get('x-guest-token');
  if (!token) token = readSessionId(request.headers.get('cookie'));

  let userId: string | undefined = undefined;
  if (token) {
    try {
      const session = await getSession(env, token);
      if (session && session.user && session.user.id) userId = session.user.id;
    } catch (e) {}
  }

  try {
    const res = await generateViaCore(context.env, { aiRequest: body, userId });
    if (!res.ok) return new Response(JSON.stringify({ success: false, error: res.error }), { status: 500 });
    return new Response(JSON.stringify({ success: true, data: res.data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
  }
};
