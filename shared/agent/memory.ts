import { getLogger } from "../logger";
import type { AgentMemory } from "./types.ts";

const log = getLogger("agent_memory");

let conversationStore: Record<string, Array<{ role: string; content: string; ts: string }>> = {};

export class MemoryService {
  // In-memory conversation memory per user
  static getUserMessages(userId: string): Array<{ role: string; content: string }> {
    return (conversationStore[userId] || []).map(m => ({ role: m.role, content: m.content }));
  }

  static addMessage(userId: string, role: string, content: string, env?: any): void {
    if (!conversationStore[userId]) conversationStore[userId] = [];
    conversationStore[userId].push({ role, content, ts: new Date().toISOString() });

    // Persist to D1 if available
    try {
      const db = env?.DB;
      if (db && db.prepare) {
        db.prepare(
          "INSERT INTO agent_memory (user_id, memory_type, content, metadata) VALUES (?, '" + "'conversation'" + "', ?, ?)"
        ).run(userId, content, JSON.stringify({ role, ts: new Date().toISOString() }));
      }
    } catch (e) {
      log.warn("Memory persist failed", { error: String(e) });
    }
  }

  // Summarize long conversations to keep memory manageable
  static summarizeHistory(userId: string, maxMessages: number = 10): Array<{ role: string; content: string }> {
    const msgs = (conversationStore[userId] || []);
    if (msgs.length <= maxMessages * 2) return msgs.slice(-maxMessages).map(m => ({ role: m.role, content: m.content }));

    // Keep first N and last N messages (summary replaces middle)
    const head = msgs.slice(0, Math.floor(maxMessages / 2));
    const tail = msgs.slice(-Math.ceil(maxMessages / 2));
    return [...head.map(m => ({ role: m.role, content: m.content })), ...tail.map(m => ({ role: m.role, content: m.content }))];
  }

  // Task memory - store one-shot task results
  private static _taskCache: Record<string, AgentMemory> = {};

  static saveTaskMemory(taskId: string, data: AgentMemory): void {
    MemoryService._taskCache[taskId] = data;
  }

  static getTaskMemory(taskId: string): AgentMemory | undefined {
    return MemoryService._taskCache[taskId];
  }

  static clearUserMemory(userId: string): void {
    delete conversationStore[userId];
    log.info("Cleared user memory", { userId });
  }

  static cleanupExpired(): void {
    const now = Date.now();
    for (const taskId of Object.keys(MemoryService._taskCache)) {
      const mem = MemoryService._taskCache[taskId];
      if (mem.expiresAt) {
        const exp = new Date(mem.expiresAt).getTime();
        if (exp < now) {
          delete MemoryService._taskCache[taskId];
        }
      }
    }
  }
}
