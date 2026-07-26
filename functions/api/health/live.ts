import type { PagesFunction } from "@cloudflare/workers-types";

export const onRequestGet = async (context: Parameters<PagesFunction>[0]) => {
  return new Response(JSON.stringify({ status: 'alive', service: 'ai-platform' }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};