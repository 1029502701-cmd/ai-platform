// Scenario Manager
// Manages predefined AI usage scenarios with default model, prompt template, and parameters.

import type { ScenarioDefinition, ModelConfig } from '../types/index';

// In-memory scenario store (backed by D1 at runtime)
const scenarios: Map<string, ScenarioDefinition> = new Map();

export function registerScenario(def: ScenarioDefinition): void {
  scenarios.set(def.scenarioKey, def);
}

export function getScenario(key: string): ScenarioDefinition | null {
  return scenarios.get(key) || null;
}

export function listScenarios(): ScenarioDefinition[] {
  return Array.from(scenarios.values());
}

export async function loadScenariosFromDB(env: any): Promise<void> {
  try {
    const db = env?.DB;
    if (!db || !db.prepare) return;

    const res = await db.prepare(
      'SELECT scenario_key, name, type, default_model_id, allowed_models, system_prompt, max_tokens, temperature, variables_schema, enabled FROM ai_scenarios'
    ).all();

    if (res && res.results) {
      for (const row of res.results) {
        scenarios.set(row.scenario_key, {
          scenarioKey: row.scenario_key,
          name: row.name,
          type: row.type as any,
          defaultModelId: row.default_model_id,
          allowedModels: row.allowed_models ? JSON.parse(row.allowed_models) : undefined,
          systemPrompt: row.system_prompt,
          maxTokens: row.max_tokens,
          temperature: row.temperature,
          variablesSchema: row.variables_schema ? JSON.parse(row.variables_schema) : undefined,
          enabled: row.enabled !== false,
        });
      }
    }
  } catch (e) {
    // ignore DB errors - scenarios may not exist yet
  }
}

export async function invalidateScenarioCache(env: any): Promise<void> {
  try {
    const kv = env?.USER_CACHE;
    if (kv && kv.put) {
      await kv.put('scenarios_json', '');
    }
  } catch (_) {}
  // force reload on next access
  scenarios.clear();
}

// Resolve default model for a scenario
export function resolveDefaultModel(scenarioKey: string, allConfigs: ModelConfig[]): string | null {
  const scenario = scenarios.get(scenarioKey);
  if (!scenario) return null;
  const model = scenario.defaultModelId;
  if (!model) return null;
  const cfg = allConfigs.find(c => c.modelId === model);
  return cfg ? cfg.modelId : null;
}
