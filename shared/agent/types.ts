;import type { AIToolDef } from "../ai/tool_registry.ts";

export type AgentStatus = "active" | "inactive" | "draft";
export type AgentTaskStatus = "pending" | "running" | "waiting" | "completed" | "failed" | "cancelled";
export type MemoryType = "conversation" | "user" | "task" | "knowledge";
export type NodeType = "prompt" | "tool" | "knowledge" | "llm" | "condition" | "loop" | "delay" | "output";

// Agent definition
export interface AgentDef {
  id?: number;
  key: string;
  name: string;
  description?: string;
  status?: AgentStatus;
  defaultModel?: string;
  defaultPrompt?: string;
  maxSteps?: number;
  knowledgeBaseId?: number;
  tools?: AIToolDef[];
  config?: Record<string, any>;
}

// Agent task
export interface AgentTask {
  id?: number;
  userId?: number;
  agentId: number;
  workflowId?: number;
  inputData?: Record<string, any>;
  status: AgentTaskStatus;
  currentStep?: string;
  stepsCompleted?: number;
  totalSteps?: number;
  result?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  createdAt?: string;
}

// Workflow
export interface WorkflowNode {
  id?: number;
  workflowId: number;
  nodeId: string;
  nodeType: NodeType;
  config?: Record<string, any>;
  displayName?: string;
  positionX?: number;
  positionY?: number;
}

export interface WorkflowEdge {
  id?: number;
  workflowId: number;
  sourceNodeId: string;
  targetNodeId: string;
  conditionExpression?: string;
}

export interface AgentWorkflow {
  id?: number;
  agentId: number;
  name: string;
  description?: string;
  definition?: Record<string, any>;
  version?: number;
  status?: AgentStatus;
}

// Memory
export interface AgentMemory {
  id?: number;
  userId?: number;
  taskId?: number;
  memoryType?: MemoryType;
  content: string;
  metadata?: Record<string, any>;
  expiresAt?: string;
  createdAt?: string;
}

// Planner output
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
  maxIterations?: number;
}

