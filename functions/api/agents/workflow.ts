import type { PagesFunction } from "@cloudflare/workers-types";
import { requireUserAuth, jsonResponse } from "../../_auth.ts";

export const onRequestPost = async (context: Parameters<PagesFunction>[0]) => {
  const auth = await requireUserAuth(context);
  if (!auth) return jsonResponse({ code: "UNAUTHORIZED" }, 401);

  try {
    const body = await context.request.json() as any;
    const workflowDef = body.definition || {};
    const input = body.input || {};

    const { runWorkflow } = await import("../../../shared/agent/workflow.ts");

    // Simple DAG execution from definition
    const nodes = (workflowDef.nodes || []).map((n: any, idx: number) => ({
      ...n, nodeId: n.nodeId || `node_${idx}`, nodeType: n.nodeType || "prompt", config: n.config || {},
    }));
    const edges = (workflowDef.edges || []).map((e: any) => ({
      ...e, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId,
    }));

    const output = await runWorkflow(nodes, edges, input, context.env as any);

    return jsonResponse({ success: true, output, stepCount: Object.keys(output).length }, 200);
  } catch (e) {
    return jsonResponse({ code: "WORKFLOW_ERROR", message: String(e) }, 500);
  }
};
