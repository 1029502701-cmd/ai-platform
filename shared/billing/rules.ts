import { getLogger } from "../logger";
const log = getLogger("billing_rules");

let cachedRules: Record<string, any> = {};
let loaded = false;

export interface BillingRule {
  id?: number;
  ruleKey: string;
  serviceType?: string;
  target?: string;
  costPer1mInput?: number;
  costPer1mOutput?: number;
  creditsPer1mInput?: number;
  creditsPer1mOutput?: number;
  imageCostCents?: number;
  agentCostCents?: number;
  knowledgeCostCents?: number;
}

export async function loadBillingRules(env: any): Promise<BillingRule[]> {
  if (loaded && Object.keys(cachedRules).length > 0) return Object.values(cachedRules);
  
  try {
    const db = env?.DB;
    if (!db?.prepare) {
      // Fallback defaults
      cachedRules = getDefaultRules();
      loaded = true;
      return Object.values(cachedRules);
    }

    const rows: any[] = await db.prepare(
      "SELECT * FROM billing_rules WHERE enabled = 1"
    ).all();

    for (const r of rows || []) {
      cachedRules[r.rule_key] = {
        ...r,
        costPer1mInput: r.cost_per_1m_input,
        costPer1mOutput: r.cost_per_1m_output,
        creditsPer1mInput: r.credits_per_1m_input,
        creditsPer1mOutput: r.credits_per_1m_output,
        imageCostCents: r.image_cost_cents,
        agentCostCents: r.agent_cost_cents,
        knowledgeCostCents: r.knowledge_cost_cents,
      };
    }
    loaded = true;
    log.info("Billing rules loaded", { count: Object.keys(cachedRules).length });
    return Object.values(cachedRules);
  } catch (e) {
    log.warn("Billing rules DB error, using defaults", { error: String(e) });
    cachedRules = getDefaultRules();
    loaded = true;
    return Object.values(cachedRules);
  }
}

function getDefaultRules(): Record<string, any> {
  return {
    gpt4omini:   { ruleKey: "gpt4omini",     serviceType: "ai",  target: "openai-gpt-4o-mini",     costPer1mInput: 150,  costPer1mOutput: 600,  creditsPer1mInput: 150, creditsPer1mOutput: 600 },
    gpt4o:       { ruleKey: "gpt4o",         serviceType: "ai",  target: "openai-gpt-4o",          costPer1mInput: 2500, costPer1mOutput: 10000,creditsPer1mInput: 2500,creditsPer1mOutput: 10000 },
    gemini:      { ruleKey: "gemini",        serviceType: "ai",  target: "gemini-pro",             costPer1mInput: 350,  costPer1mOutput: 1050, creditsPer1mInput: 350,  creditsPer1mOutput: 1050 },
    claudeopus:  { ruleKey: "claudeopus",    serviceType: "ai",  target: "claude-opus",            costPer1mInput: 15000,costPer1mOutput: 75000,creditsPer1mInput: 15000,creditsPer1mOutput: 75000 },
    deepseek:    { ruleKey: "deepseek",      serviceType: "ai",  target: "deepseek-chat",          costPer1mInput: 140,  costPer1mOutput: 280,  creditsPer1mInput: 140,  creditsPer1mOutput: 280 },
    image_gen:   { ruleKey: "image_gen",     serviceType: "ai",  target: "all",                    imageCostCents: 1500 },
    agent_exec:  { ruleKey: "agent_exec",    serviceType: "ai",  target: "all",                    agentCostCents: 500 },
  };
}

// Get pricing for a specific model/service
export function getRule(ruleKey: string, rules?: BillingRule[]): BillingRule | undefined {
  if (rules) return rules.find(r => r.ruleKey === ruleKey);
  // all loading available via public loadBillingRules function
  return undefined;
}

// Refresh rules cache
export async function refreshBillingRules(env: any): Promise<void> {
  loaded = false;
  cachedRules = {};
  await loadBillingRules(env);
  log.info("Billing rules refreshed");
}
