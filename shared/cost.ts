export const MODEL_COSTS: Record<string, { per_1m_input: number; per_1m_output: number }> = {
  'openai-gpt-4o-mini':     { per_1m_input: 0.15,  per_1m_output: 0.60 },
  'openai-gpt-4o':          { per_1m_input: 2.50,   per_1m_output: 10.00 },
  'gemini-pro':             { per_1m_input: 0.35,   per_1m_output: 1.05 },
  'claude-opus':            { per_1m_input: 15.00,  per_1m_output: 75.00 },
  'claude-sonnet':          { per_1m_input: 3.00,   per_1m_output: 15.00 },
  'deepseek-chat':          { per_1m_input: 0.14,   per_1m_output: 0.28 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costData = MODEL_COSTS[model];
  if (!costData) return 0;
  return (inputTokens / 1_000_000) * costData.per_1m_input +
         (outputTokens / 1_000_000) * costData.per_1m_output;
}