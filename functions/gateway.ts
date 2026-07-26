// API Gateway Worker — unified request router for /api/* routes
// Task-Platform-007: Production deployment integration
export const onRequest = async (context: any) => {
  const { request } = context;
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();

  // CORS Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Guest-Token, X-Request-ID",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Health check
  if (url.pathname === "/api/health") {
    return new Response(JSON.stringify({
      ok: true,
      service: "ai-saas-platform",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      requestId,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // Add request ID header
  const response = await context.next();
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-Service", "api-gateway");

  return response;
};
