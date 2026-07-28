import { ChatService } from "../../services/ChatService";
import { readSessionId } from "../../../shared/auth/cookies";
import { getSession } from "../../../shared/auth/session";
import { validateGuestToken } from "../../../shared/auth/guest";
import { jsonResponse } from "../../../shared/lib/response";

export const onRequest = async (context) => {
  const { request, env, params } = context;
  const path = request.pathname.replace(/^\/api\/chat\//, "");

  // Extract auth token
  let token = null;
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (request.headers.has("x-guest-token")) {
    token = request.headers.get("x-guest-token");
  } else {
    const cookie = request.headers.get("cookie");
    if (cookie) token = readSessionId(cookie);
  }

  let userId = null;
  if (token) {
    try {
      const session = await getSession(env, token);
      if (session?.user?.id) userId = session.user.id;
    } catch (e) {
      const guestId = await validateGuestToken(env, token);
      if (guestId) userId = guestId;
    }
  }

  if (!userId) {
    return jsonResponse({ code: "UNAUTHORIZED", message: "Authentication required" }, 401);
  }

  switch (path) {
    case "send":
      return await handleSend(env, userId, request);
    case "history/" + params.id:
      return await handleHistory(env, userId, params.id);
    case "conversations":
      return await handleListConversations(env, userId);
    default:
      return jsonResponse({ code: "NOT_FOUND", message: "Endpoint not found" }, 404);
  }
};

async function handleSend(env, userId, request) {
  const body = await request.json();
  const conversationId = body.conversationId || null;
  const message = body.message;

  if (!message) {
    return jsonResponse({ code: "MISSING_MESSAGE", message: "Message is required" }, 400);
  }

  let convId = conversationId;
  if (!convId) {
    const ChatService = require("../../services/ChatService").default;
    const chatSvc = new ChatService(env);
    const conv = await chatSvc.createConversation(userId);
    convId = conv.id;
  }

  try {
    const ChatService = require("../../services/ChatService").default;
    const chatSvc = new ChatService(env);
    const config = await chatSvc.getChatConfig();
    const result = await chatSvc.sendMessage(env, userId, convId, message, config);
    return jsonResponse({ success: true, data: result }, 200);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

async function handleHistory(env, userId, conversationId) {
  try {
    const ChatService = require("../../services/ChatService").default;
    const chatSvc = new ChatService(env);
    const result = await chatSvc.getConversationHistory(userId, conversationId);
    return jsonResponse({ success: true, data: result }, 200);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 404);
  }
}

async function handleListConversations(env, userId) {
  try {
    const ChatService = require("../../services/ChatService").default;
    const chatSvc = new ChatService(env);
    const result = await chatSvc.listConversations(userId);
    return jsonResponse({ success: true, data: result }, 200);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
};

