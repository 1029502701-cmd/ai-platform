import { getLogger } from "../logger";
const log = getLogger("agent_planner");

// Simple rule-based planner that analyzes user requests and generates execution plans
export interface PlanningStep {
  id: string;
  action: string;
  tool?: string;
  toolArgs?: Record<string, any>;
  dependsOn?: string[];
  description: string;
}

export interface Plan {
  summary: string;
  steps: PlanningStep[];
  maxIterations: number;
}

export function planTask(action: string, context: Record<string, any>): Plan {
  const lowerAction = action.toLowerCase();
  const steps: PlanningStep[] = [];
  let stepId = 0;

  // Simple NLP: detect intent from action string
  if (lowerAction.includes("analyze") || lowerAction.includes("beauty") || lowerAction.includes("skin")) {
    steps.push({
      id: `step_${++stepId}`,
      action: "analyze",
      tool: "knowledge",
      toolArgs: { type: "beauty" },
      dependsOn: [],
      description: "Analyze beauty/skin data using knowledge base",
    });
    steps.push({
      id: `step_${++stepId}`,
      action: "generate",
      tool: "calculator",
      toolArgs: {},
      dependsOn: ["step_1"],
      description: "Compute scores and generate results",
    });
    steps.push({
      id: `step_${++stepId}`,
      action: "report",
      tool: "output",
      dependsOn: ["step_2"],
      description: "Generate final beauty report",
    });
  } else if (lowerAction.includes("translate")) {
    steps.push({
      id: `step_${++stepId}`,
      action: "detect_language",
      tool: undefined,
      dependsOn: [],
      description: "Detect source language",
    });
    steps.push({
      id: `step_${++stepId}`,
      action: "translate",
      tool: "knowledge",
      toolArgs: { type: "translation" },
      dependsOn: ["step_1"],
      description: "Perform translation",
    });
  } else if (lowerAction.includes("write") || lowerAction.includes("create") || lowerAction.includes("compose")) {
    steps.push({
      id: `step_${++stepId}`,
      action: "research",
      tool: "search",
      dependsOn: [],
      description: "Search for relevant information",
    });
    steps.push({
      id: `step_${++stepId}`,
      action: "draft",
      tool: "knowledge",
      toolArgs: { type: "writing" },
      dependsOn: ["step_1"],
      description: "Generate draft content",
    });
    steps.push({
      id: `step_${++stepId}`,
      action: "refine",
      tool: "output",
      dependsOn: ["step_2"],
      description: "Refine and polish content",
    });
  } else if (lowerAction.includes("code") || lowerAction.includes("debug") || lowerAction.includes("program")) {
    steps.push({
      id: `step_${++stepId}`,
      action: "understand",
      tool: undefined,
      dependsOn: [],
      description: "Understand the code requirement",
    });
    steps.push({
      id: `step_${++stepId}`,
      action: "solve",
      tool: "database",
      dependsOn: ["step_1"],
      description: "Generate solution",
    });
    steps.push({
      id: `step_${++stepId}`,
      action: "verify",
      tool: "calculator",
      dependsOn: ["step_2"],
      description: "Verify solution correctness",
    });
  } else {
    // Default: single-step LLM call
    steps.push({
      id: `step_${++stepId}`,
      action: "respond",
      tool: undefined,
      dependsOn: [],
      description: "Direct AI response to user request",
    });
  }

  return {
    summary: `Plan for: ${action}`,
    steps,
    maxIterations: Math.max(steps.length, 5),
  };
}

// AI-assisted planning via LLM (for complex tasks)
export async function planWithAI(prompt: string, agentKey: string, env: any): Promise<Plan> {
  try {
    log.info("Planning with AI", { prompt: prompt.substring(0, 100) });
    // In production: call LLM with structured output format
    // For now, fall back to rule-based planner
    return planTask(prompt, {});
  } catch (e) {
    log.warn("AI planning failed, using rules", { error: String(e) });
    return planTask(prompt, {});
  }
}



