import type { BillingRule } from "./rules.ts";

export const MODEL_COSTS_USD: Record<string, { per_1m_input: number; per_1m_output: number }> = {
  'openai-gpt-4o-mini':   { per_1m_input: 0.15,  per_1m_output: 0.60 },
  'openai-gpt-4o':        { per_1m_input: 2.50,  per_1m_output: 10.00 },
  'gemini-pro':           { per_1m_input: 0.35,  per_1m_output: 1.05 },
  'claude-opus':          { per_1m_input: 15.00, per_1m_output: 75.00 },
  'claude-sonnet':        { per_1m_input: 3.00,  per_1m_output: 15.00 },
  'deepseek-chat':        { per_1m_input: 0.14,  per_1m_output: 0.28 },
};

/** Estimate credit cost in cents based on billing rules or defaults */
export async function estimateCost(params: { model: string; inputTokens: number; outputTokens: number; type?: "text" | "image" | "agent"; rules?: BillingRule[] }): Promise<number> {
  const { model, inputTokens, outputTokens, type = "text", rules } = params;
  
  if (type === "image") {
    if (rules) {
      const imgRule = rules.find(r => r.ruleKey === "image_gen");
      return imgRule?.imageCostCents ?? 1500;
    }
    return 1500;
  }
  
  if (type === "agent") {
    if (rules) {
      const agentRule = rules.find(r => r.ruleKey === "agent_exec");
      return agentRule?.agentCostCents ?? 500;
    }
    return 500;
  }

  // Text-based: look up billing rule
  if (rules && rules.length > 0) {
    const rule = rules.find(r => r.target === model || r.target === "all" || r.ruleKey === extractProviderKey(model));
    if (rule) {
      const perInput = rule.creditsPer1mInput || rule.costPer1mInput || 0;
      const perOutput = rule.creditsPer1mOutput || rule.costPer1mOutput || 0;
      return Math.round((inputTokens / 1_000_000) * (perInput + perOutput));
    }
  }

  // Fallback to USD model costs converted to cents (approximate)
  const usdCost = MODEL_COSTS_USD[model];
  if (usdCost) {
    const usdTotal = (inputTokens / 1_000_000) * usdCost.per_1m_input + (outputTokens / 1_000_000) * usdCost.per_1m_output;
    return Math.round(usdTotal * 100); // rough conversion
  }

  return 0;
}

function extractProviderKey(model: string): string {
  if (model.includes("4o-mini")) return "gpt4omini";
  if (model.includes("4o")) return "gpt4o";
  if (model.includes("gemini")) return "gemini";
  if (model.includes("claude")) return "claudeopus";
  if (model.includes("deepseek")) return "deepseek";
  return "";
}
