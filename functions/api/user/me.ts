import type { PagesFunction } from "@cloudflare/workers-types";
import { getSession } from "../../../shared/auth/session.ts";

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export const onRequestGet = async (context) => {
  const { env, request } = context;
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonRes({ error: "UNAUTHORIZED" }, 401);
  }
  const token = authHeader.slice(7);
  const session = await getSession(env, token);
  if (!session) {
    return jsonRes({ error: "SESSION_INVALID" }, 401);
  }
  return jsonRes({ success: true, data: session.user });
};
