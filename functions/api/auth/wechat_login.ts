import type { PagesFunction } from "@cloudflare/workers-types";
import type { AuthEnv } from '../../../shared/auth/types.ts';

type RequestContext = Parameters<PagesFunction<AuthEnv>>[0];

export const onRequestGet = async (context: RequestContext) => {
  const { request } = context;
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || url.searchParams.get('guestToken') || null;

  // In production this should redirect to WeChat OAuth with proper client_id and redirect_uri.
  // For development and CI we return a mocked callback URL that the frontend can call directly.
  const mockCode = 'MOCK_WECHAT_CODE_' + Math.random().toString(36).slice(2,8);
  const callbackUrl = `/api/auth/wechat_callback?code=${mockCode}${state ? `&state=${encodeURIComponent(state)}` : ''}`;

  return new Response(JSON.stringify({ success: true, data: { url: callbackUrl } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
