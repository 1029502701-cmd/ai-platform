import type { PagesFunction } from "@cloudflare/workers-types";

type Env = Record<string, unknown>;

type RequestContext = Parameters<PagesFunction<Env>>[0];

// Global middleware for every Pages Function request
export const onRequest = async (context: RequestContext) => {
  // --- 1. Generate unique request ID ---
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // --- 2. Execute next handler ---
    const response = await context.next();

    // --- 3. Add standard headers ---
    response.headers.set("X-Request-Id", requestId);
    response.headers.set(
      "X-Response-Time",
      `${Date.now() - startTime}ms`
    );

    return response;
  } catch (error) {
    // --- 4. Error handling — do NOT expose stack trace ---
    console.error("[Global Error]", {
      error: error instanceof Error ? error.message : "Unknown error",
      requestId,
      url: context.request.url,
    });

    return new Response(
      JSON.stringify({
        success: false,
        data: null,
        error: { code: "INTERNAL_ERROR", message: "Server internal error" },
        meta: { requestId, timestamp: new Date().toISOString() },
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }
};
