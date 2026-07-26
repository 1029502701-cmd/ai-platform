import { getLogger } from "../logger";
const log = getLogger("agent_registry");

let agentsCache: Record<string, any> = {};
let dbLoaded = false;

export const DEFAULT_AGENTS: Record<string, any> = {
  assistant: {
    key: "assistant",
    name: "AI Assistant",
    description: "General purpose AI assistant for Q&A and conversation",
    defaultModel: "openai-gpt-4o-mini",
    maxSteps: 10,
    tools: ["calculator", "search", "knowledge"],
  },
  beauty: {
    key: "beauty",
    name: "AI Beauty Advisor",
    description: "Professional beauty analysis and recommendation agent",
    defaultModel: "openai-gpt-4o",
    maxSteps: 5,
    tools: ["knowledge", "image"],
    knowledgeBaseId: 1,
  },
  writer: {
    key: "writer",
    name: "Content Writer",
    description: "AI content creation and writing assistant",
    defaultModel: "openai-gpt-4o-mini",
    maxSteps: 15,
    tools: ["knowledge", "search"],
  },
  coder: {
    key: "coder",
    name: "Code Assistant",
    description: "Programming and debugging assistant",
    defaultModel: "claude-opus",
    maxSteps: 20,
    tools: ["calculator", "database"],
  },
};

export async function loadAgentsFromDB(env: any): Promise<Record<string, any>> {
  if (dbLoaded && Object.keys(agentsCache).length > 0) return agentsCache;
  try {
    const db = env?.DB;
    if (!db || !db.prepare) {
      agentsCache = { ...DEFAULT_AGENTS };
      dbLoaded = true;
      return agentsCache;
    }
    const rows: any[] = await db.prepare(
      "SELECT id, key, name, description, status, default_model, default_prompt, max_steps, knowledge_base_id, tools, config FROM agents WHERE status = '" + "'active'" + "'"
    ).all();
    for (const r of rows || []) {
      agentsCache[r.key] = {
        ...r,
        tools: r.tools ? JSON.parse(r.tools) : [],
        config: r.config ? JSON.parse(r.config) : {},
      };
    }
    // Merge with defaults
    agentsCache = { ...DEFAULT_AGENTS, ...agentsCache };
    dbLoaded = true;
    log.info("Agents loaded", { count: Object.keys(agentsCache).length });
  } catch (e) {
    log.warn("Agent loading failed, using defaults", { error: String(e) });
    agentsCache = { ...DEFAULT_AGENTS };
    dbLoaded = true;
  }
  return agentsCache;
}

export async function getAgent(key: string, env?: any): Promise<any> {
  const agents = await loadAgentsFromDB(env);
  return agents[key] || null;
}

export async function listAgents(env?: any): Promise<any[]> {
  const agents = await loadAgentsFromDB(env);
  return Object.values(agents);
}

export async function createAgent(env: any, data: Record<string, any>): Promise<number> {
  const db = env?.DB;
  if (!db || !db.prepare) throw new Error("DB_NOT_AVAILABLE");
  const res: any = await db.prepare(
    "INSERT INTO agents (key, name, description, default_model, default_prompt, max_steps, knowledge_base_id, tools, config, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '" + "'active'" + "')"
  ).run(
    data.key, data.name, data.description || null, data.defaultModel || "openai-gpt-4o-mini",
    data.defaultPrompt || null, data.maxSteps || 10, data.knowledgeBaseId || null,
    data.tools ? JSON.stringify(data.tools) : null,
    data.config ? JSON.stringify(data.config) : null
  );
  return res.lastInsertRowid as number;
}
