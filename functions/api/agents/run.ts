import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../_auth.ts";
import { getAgent } from "../../../shared/agent/registry.ts";
import { planTask } from "../../../shared/agent/planner.ts";
import { AgentExecutor } from "../../../shared/agent/executor.ts";
import { MemoryService } from "../../../shared/agent/memory.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const body = await context.request.json() as any;
    const agentKey = body.agentKey || "assistant";
    const input = body.input || body.action || body.message || "Hello";
    const userId = String(auth.user.id);
    const userName = auth.user.nickname || auth.user.username || "user";

    // Load agent
    const agent = await getAgent(agentKey, context.env as any);
    if (!agent) return jsonResponse({ code: "AGENT_NOT_FOUND", agentKey }, 404);

    // Generate plan
    const plan = planTask(input, { userId, userName, agentKey });

    // Execute plan
    const executor = new AgentExecutor(plan, agentKey);
    const result = await executor.execute(context.env as any);

    // Save memory
    MemoryService.addMessage(userId, "user", input);
    if (result.finalOutput) {
      MemoryService.addMessage(userId, "assistant", result.finalOutput);
    }

    return jsonResponse({
      success: result.success,
      agentKey,
      agentName: agent.name,
      planSummary: plan.summary,
      stepsExecuted: Object.keys(result.stepResults).length,
      totalSteps: plan.steps.length,
      output: result.finalOutput,
      error: result.error,
      durationMs: result.durationMs,
    }, 200);
  } catch (e) {
    return jsonResponse({ code: "EXECUTION_ERROR", message: String(e) }, 500);
  }
};
