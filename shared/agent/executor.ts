import { getLogger } from "../logger";
import { executeTool } from "../ai/tool_registry.ts";
import { loadKnowledgeContext } from "../ai/knowledge_service.ts";
import type { Plan, PlanningStep } from "./planner.ts";

const log = getLogger("agent_executor");

export interface ExecutionResult {
  success: boolean;
  stepResults: Record<string, unknown>;
  finalOutput?: string;
  error?: string;
  durationMs: number;
}

export class AgentExecutor {
  private plan: Plan;
  private stepResults: Record<string, unknown>;
  private agentKey: string;

  constructor(plan: Plan, agentKey: string) {
    this.plan = plan;
    this.stepResults = {};
    this.agentKey = agentKey;
  }

  async execute(env: any): Promise<ExecutionResult> {
    const startTime = Date.now();
    const stepResults: Record<string, unknown> = {};

    for (const step of this.plan.steps) {
      try {
        // Check dependencies
        if (step.dependsOn && step.dependsOn.length > 0) {
          for (const dep of step.dependsOn) {
            if (!(dep in stepResults)) {
              throw new Error(`Dependency ${dep} not completed`);
            }
          }
        }

        log.info("Executing step", { stepId: step.id, action: step.action });

        if (step.tool === "knowledge") {
          const query = step.toolArgs?.type ? `Query: ${step.toolArgs.type}` : step.action;
          const result = await loadKnowledgeContext(this.agentKey, query, env);
          stepResults[step.id] = { output: result, action: step.action };
        } else if (step.tool) {
          const result = await executeTool(step.tool, step.toolArgs || {});
          stepResults[step.id] = { output: result, action: step.action };
        } else {
          // No tool - direct action (LLM response placeholder)
          stepResults[step.id] = { output: `Completed: ${step.description}`, action: step.action };
        }

        this.stepResults = stepResults;
      } catch (e) {
        log.error("Step failed", { stepId: step.id, error: String(e) });
        stepResults[step.id] = { error: String(e), action: step.action };

        if (!this.canRetry(step, e as Error)) {
          const elapsed = Date.now() - startTime;
          return {
            success: false,
            stepResults,
            error: String(e),
            durationMs: elapsed,
          };
        }
      }
    }

    const elapsed = Date.now() - startTime;
    const finalOutput = Object.values(stepResults).map((r: any) => r?.output || "").filter(Boolean).join("\n\n");

    return {
      success: true,
      stepResults,
      finalOutput: finalOutput || "Task completed",
      durationMs: elapsed,
    };
  }

  private canRetry(_step: PlanningStep, error: Error): boolean {
    // Retry on transient errors, fail on permanent ones
    const nonRetryable = ["NOT_FOUND", "UNAUTHORIZED", "INVALID_INPUT"];
    return !nonRetryable.some(code => error.message.includes(code));
  }
}
