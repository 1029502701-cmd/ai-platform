import { getLogger } from "../logger";

const log = getLogger("workflow_marketplace");

export interface WorkflowNode {
  id: string;
  type: 'prompt' | 'tool' | 'knowledge' | 'llm' | 'condition' | 'loop' | 'delay' | 'output';
  config: Record<string, unknown>;
  next?: string[];
}

export interface WorkflowEdge {
  from: string;
  to: string;
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  entryNode: string;
}

export interface WorkflowTemplate {
  id: number;
  slug: string;
  name: string;
  description: string;
  definitionJson: string;
  category: string;
  previewImage?: string;
  version: string;
  authorId?: number;
  rating: number;
  installCount: number;
  status: 'published' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
}

/**
 * Workflow Engine 鈥?executes DAG-based AI workflows.
 */
export class WorkflowEngine {
  /** Validate a workflow definition has proper DAG structure */
  static validateDefinition(definition: WorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!definition.nodes?.length) errors.push('No nodes defined');
    if (!definition.entryNode) errors.push('Missing entry node');

    // Check no cycles (simple DFS)
    const visited = new Set<string>();
    const checkCycle = (nodeId: string): boolean => {
      if (visited.has(nodeId)) return true;
      visited.add(nodeId);
      const node = definition.nodes.find(n => n.id === nodeId);
      if (!node) return false;
      for (const target of (node.next || [])) { if (checkCycle(target)) return true; }
      return false;
    };

    if (checkCycle(definition.entryNode)) errors.push('Circular dependency detected');

    // Check all edge targets exist as nodes
    for (const edge of definition.edges || []) {
      if (!definition.nodes.find(n => n.id === edge.from)) errors.push(`Unknown source node: ${edge.from}`);
      if (!definition.nodes.find(n => n.id === edge.to)) errors.push(`Unknown target node: ${edge.to}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /** Export a workflow from DB row to definition object */
  static exportWorkflow(row: any): WorkflowTemplate {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      definitionJson: row.definition_json,
      category: row.category,
      previewImage: row.preview_image,
      version: row.version,
      authorId: row.author_id,
      rating: row.rating || 0,
      installCount: row.install_count || 0,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** Simulate execution of a workflow node (stub for production logic) */
  static async executeNode(nodeDef: WorkflowNode, _context: Record<string, unknown>): Promise<{ success: boolean; result?: unknown; error?: string }> {
    try {
      switch (nodeDef.type) {
        case 'prompt':
          log.info("Executing prompt node", { id: nodeDef.id });
          return { success: true, result: `[prompt output: ${nodeDef.id}]` };
        case 'knowledge':
          return { success: true, result: `[knowledge retrieved for ${nodeDef.id}]` };
        case 'llm':
          return { success: true, result: `[LLM response: ${JSON.stringify(nodeDef.config || {})}]` };
        case 'tool':
          return { success: true, result: `[tool executed: ${JSON.stringify(nodeDef.config || {})}]` };
        case 'condition':
          return { success: true, result: true };
        default:
          return { success: true };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
