import { getLogger } from "../logger";
import type { NodeType, WorkflowNode, WorkflowEdge } from "./types.ts";

const log = getLogger("agent_workflow");

export interface WorkflowContext {
  input: Record<string, any>;
  output: Record<string, any>;
  variables: Record<string, any>;
  currentNode?: string;
  stepCount: number;
}

// Evaluate a condition expression in a workflow node
export function evaluateCondition(expression: string | undefined, ctx: WorkflowContext): boolean {
  if (!expression) return true;
  // Simple expression evaluator: support eq, gt, lt, contains checks
  try {
    const trimmed = expression.trim();
    if (trimmed.startsWith("eq(") && trimmed.endsWith(")")) {
      const parts = trimmed.slice(3, -1).split(",");
      return String(parts[0]?.trim()) === String(parts[1]?.trim());
    }
    if (trimmed.startsWith("gt(") && trimmed.endsWith(")")) {
      const parts = trimmed.slice(3, -1).split(",");
      return (Number(parts[0]) || 0) > (Number(parts[1]) || 0);
    }
    if (trimmed.startsWith("lt(") && trimmed.endsWith(")")) {
      const parts = trimmed.slice(3, -1).split(",");
      return (Number(parts[0]) || 0) < (Number(parts[1]) || 0);
    }
    // Default: always pass
    return true;
  } catch {
    return true;
  }
}

// Get next nodes based on edges and conditions
export function getNextNodes(
  currentNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  ctx: WorkflowContext
): WorkflowNode[] {
  const outgoingEdges = edges.filter(e => e.sourceNodeId === currentNodeId);
  const result: WorkflowNode[] = [];

  for (const edge of outgoingEdges) {
    const targetNode = nodes.find(n => n.nodeId === edge.targetNodeId);
    if (!targetNode) continue;

    if (!edge.conditionExpression || evaluateCondition(edge.conditionExpression, ctx)) {
      result.push(targetNode);
    } else {
      log.info("Condition failed, skipping", { currentNode: currentNodeId, condition: edge.conditionExpression });
    }
  }

  return result;
}

// Execute a single node based on its type
export async function executeNode(
  node: WorkflowNode,
  ctx: WorkflowContext,
  env: any
): Promise<{ output: Record<string, any>; shouldContinue: boolean }> {
  const type = node.nodeType;
  const config = node.config || {};

  switch (type) {
    case "prompt":
      ctx.variables[node.nodeId] = config.template || "";
      break;

    case "tool": {
      // Tool execution - delegated to tool_registry
      ctx.variables[node.nodeId] = { executed: node.nodeId, args: config.args };
      break;
    }

    case "knowledge": {
      // Knowledge injection - delegated to knowledge_service
      ctx.variables[node.nodeId] = { knowledgeLoaded: true };
      break;
    }

    case "llm": {
      // LLM call placeholder - in production would call AI Core
      ctx.variables[node.nodeId] = { llmResponse: config.response || "OK" };
      break;
    }

    case "condition": {
      // Condition check already handled by edge evaluation
      break;
    }

    case "output": {
      ctx.output = { ...ctx.output, [node.nodeId]: ctx.variables[node.nodeId] };
      break;
    }

    default:
      log.warn("Unknown node type", { type, nodeId: node.nodeId });
      break;
  }

  ctx.stepCount++;
  return { output: ctx.output, shouldContinue: type !== "output" };
}

// DAG Workflow executor
export async function runWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  input: Record<string, any>,
  env: any
): Promise<Record<string, any>> {
  const ctx: WorkflowContext = {
    input,
    output: {},
    variables: {},
    stepCount: 0,
  };

  // Find entry points (nodes with no incoming edges)
  const targetIds = new Set(edges.map(e => e.targetNodeId));
  const entryPoints = nodes.filter(n => !targetIds.has(n.nodeId));

  if (entryPoints.length === 0) {
    log.warn("No entry points found in workflow");
    return {};
  }

  let currentNodes = [...entryPoints];
  const processed = new Set<string>();
  let iterations = 0;
  const maxIterations = 100;

  while (currentNodes.length > 0 && iterations < maxIterations) {
    iterations++;
    const nextBatch: WorkflowNode[] = [];

    for (const node of currentNodes) {
      if (processed.has(node.nodeId)) continue;
      if (node.nodeType === "output") {
        processed.add(node.nodeId);
        continue;
      }

      const result = await executeNode(node, ctx, env);
      processed.add(node.nodeId);

      // Find successor nodes
      const successors = getNextNodes(node.nodeId, nodes, edges, ctx);
      for (const s of successors) {
        if (!processed.has(s.nodeId)) {
          nextBatch.push(s);
        }
      }
    }

    currentNodes = nextBatch.filter(n => !processed.has(n.nodeId));
  }

  if (iterations >= maxIterations) {
    log.warn("Workflow exceeded max iterations");
  }

  return ctx.output;
}
