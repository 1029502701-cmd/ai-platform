import { DeveloperService } from "../../shared/developer/service.ts";

// Custom jsonResponse for OpenAPI routes
export function jsonResponse(data: unknown, status: number = 200): Response {
  const success = status < 400;
  return new Response(JSON.stringify({ success, data: success ? data : null, error: success ? null : data, meta: {} }), {
    status, headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
  });
}

/**
 * Validate an API key from Authorization header or query param.
 */
export async function requireOpenApiAuth(context: any): Promise<{ developerId: number; apiKey: any } | null> {
  const { request, env } = context;
  let apiKey = "";

  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.slice(7);
  } else {
    const url = new URL(request.url);
    apiKey = url.searchParams.get("api_key") || "";
  }

  if (!apiKey) return null;

  try {
    const result = await DeveloperService.validateApiKey(env as any, apiKey);
    if (!result.valid || !result.key) return null;
    return { developerId: result.key.developerId, apiKey: result.key };
  } catch (e) {
    console.error("[OpenAPI] Auth error:", String(e));
    return null;
  }
}