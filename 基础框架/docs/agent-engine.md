---
title: Agent Engine & Workflow Platform
task: Task-Platform-014
---

# Agent Engine & Workflow Platform

> **Task-014**: Build unified Agent Engine supporting Planner, Executor, Workflow DAG, Tool Calling, and Memory.

## Architecture

```
User Request
    ↓
API Gateway
    ↓
AI Core (Scenario routing)
    │
    ├── Scenario Engine
    ├── Prompt Engine
    ├── Knowledge Engine
    ├── Model Router
    │
    ├── Agent Engine  ← NEW
    │   ├── Agent Registry    (shared/agent/registry.ts)
    │   ├── Planner           (shared/agent/planner.ts)
    │   ├── Executor          (shared/agent/executor.ts)
    │   ├── Workflow Engine   (shared/agent/workflow.ts)
    │   ├── Memory Service    (shared/agent/memory.ts)
    │   └── Tool Manager      (shared/ai/tool_registry.ts)
    │
    └── AI Queue → Provider Layer
```

## Module Structure

### shared/agent/
| File | Purpose |
|------|---------|
| `types.ts` | Core type definitions (AgentDef, AgentTask, Plan, Memory, etc.) |
| `index.ts` | Barrel export for all agent capabilities |
| `registry.ts` | Agent CRUD — load/save agents from DB + defaults |
| `planner.ts` | Rule-based + LLM-assisted task planning |
| `executor.ts` | Step-by-step plan execution with dependency management |
| `workflow.ts` | DAG workflow engine — node execution, edge conditions, cycle detection |
| `memory.ts` | Conversation/task memory service with persistence to D1 |

## Default Agents

| Agent Key | Name | Description | Model | Max Steps | Tools |
|-----------|------|-------------|-------|-----------|-------|
| `assistant` | AI Assistant | General Q&A and conversation | GPT-4o Mini | 10 | calculator, search, knowledge |
| `beauty` | Beauty Advisor | Professional beauty analysis | GPT-4o | 5 | knowledge, image |
| `writer` | Content Writer | Content creation assistant | GPT-4o Mini | 15 | knowledge, search |
| `coder` | Code Assistant | Programming/debugging helper | Claude Opus | 20 | calculator, database |

## Workflow System

### Node Types
- **prompt**: Generate text template output
- **tool**: Execute a registered tool
- **knowledge**: Load knowledge base context
- **llm**: Call language model
- **condition**: Evaluate condition expression
- **loop**: Loop over items (future)
- **delay**: Wait/pause execution (future)
- **output**: Capture final result

### Workflow Execution
1. Find entry points (nodes with no incoming edges)
2. Execute each node in DAG order
3. Evaluate edge conditions at runtime
4. Track step count and detect cycles (max 100 iterations)
5. Return composite output from all output nodes

### Condition Expressions
Simple expression format supported:
- `eq(val1, val2)` — equality check
- `gt(val1, val2)` — greater than
- `lt(val1, val2)` — less than

## Planner

Rule-based planner analyzes user input and generates execution plans:

**Detection patterns:**
- "analyze", "beauty", "skin" → 3-step beauty analysis pipeline
- "translate" → 2-step translation pipeline
- "write", "create", "compose" → 3-step content creation pipeline
- "code", "debug", "program" → 3-step coding assistance pipeline
- Everything else → single-step LLM response

Each step declares dependencies on previous steps for proper sequencing.

## Memory Service

Two-tier memory system:

**Conversation Memory:**
- In-memory sliding window (last ~N messages)
- Persisted to `agent_memory` table in D1
- Auto-summarization when conversation grows long

**Task Memory:**
- One-shot results cached by task ID
- Optional expiration (TTL)
- Persisted to D1

## Database Schema

### agents
Migration: `0027_agent_engine.sql`

| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| key | TEXT UNIQUE | Agent identifier |
| name | TEXT | Display name |
| description | TEXT | Long description |
| status | TEXT | active/inactive/draft |
| default_model | TEXT | LLM model selection |
| default_prompt | TEXT | System prompt template |
| max_steps | INTEGER | Max execution steps |
| knowledge_base_id | INTEGER FK | Linked knowledge base |
| tools | TEXT (JSON) | Enabled tools list |
| config | TEXT (JSON) | Custom configuration |

### agent_tasks
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER FK | Requesting user |
| agent_id | INTEGER FK | Running agent |
| workflow_id | INTEGER FK | Optional workflow |
| input_data | TEXT | User input |
| status | TEXT | pending/running/waiting/completed/failed/cancelled |
| current_step | TEXT | Current execution step |
| steps_completed | INTEGER | Progress tracker |
| total_steps | INTEGER | Plan total |
| result | TEXT | Final output |
| error | TEXT | Error message if failed |
| duration_ms | INTEGER | Execution time |

### agent_memory
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| user_id | INTEGER | Owner reference |
| task_id | INTEGER | Associated task |
| memory_type | TEXT | conversation/user/task/knowledge |
| content | TEXT | Stored content |
| metadata | TEXT | JSON metadata |
| expires_at | DATETIME | TTL expiry |

### agent_workflows
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| agent_id | INTEGER FK | Owning agent |
| name | TEXT | Workflow name |
| definition | TEXT (JSON) | Full workflow spec |
| version | INTEGER | Version number |

### agent_workflow_nodes
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| workflow_id | INTEGER FK | Parent workflow |
| node_id | TEXT | Unique node identifier |
| node_type | TEXT | prompt/tool/knowledge/llm/etc. |
| config | TEXT (JSON) | Node-specific config |

### agent_workflow_edges
| Field | Type | Description |
|-------|------|-------------|
| id | INTEGER PK | Auto-increment |
| workflow_id | INTEGER FK | Parent workflow |
| source_node_id | TEXT | From node |
| target_node_id | TEXT | To node |
| condition_expression | TEXT | Edge condition |

## API Endpoints

### Public Agent APIs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/agents` | None | List all available agents |
| GET | `/api/agents/:key` | None | Get agent details |
| POST | `/api/agents/run` | User | Run agent with input |
| POST | `/api/agents/workflow` | User | Execute workflow |
| GET | `/api/agents/tasks` | User | List user's agent tasks |
| POST | `/api/agents/tasks/:id/cancel` | User | Cancel a task |
| POST | `/api/agents/tasks/:id/retry` | User | Retry a failed task |
| GET | `/api/agents/memory` | User | View conversation memory |

### Admin Agent APIs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/agents` | Admin | List all agents |
| POST | `/api/admin/agents/create` | Admin | Create agent |
| PATCH | `/api/admin/agents/:id` | Admin | Update agent |
| GET | `/api/admin/agents/tasks` | Admin | View all agent tasks |
| GET | `/api/admin/agents/memory` | Admin | Memory statistics |

### Frontend Routes
| Path | Page | Auth |
|------|------|------|
| `/admin/agents` | Agent Management Page | Admin |

## Integration Flow

```
1. User requests via /api/agents/run
2. Auth middleware validates session → userId
3. AgentRegistry loads agent definition (key: "assistant")
4. Planner creates execution plan from user input
5. Executor runs steps sequentially
6. Each step may call: Tool Registry, Knowledge Service, or direct action
7. Results assembled into final output
8. Memory service stores conversation
9. Response returned with requestId, agentKey, stepsExecuted, durationMs
```

## Extending Agent Engine

To add a new agent:

1. **Add agent definition** in registry or through Admin panel
2. **Register tools** in shared/ai/tool_registry.ts
3. **Link knowledge base** if the agent needs RAG
4. **Define workflow** if complex multi-step processing needed
5. **Route scenario** in scenario_engine.ts to use the new agent

## Test Endpoints

Quick test with curl:

```bash
# List agents
curl https://your-site.com/api/agents

# Run an agent
curl -X POST https://your-site.com/api/agents/run   -H "Content-Type: application/json"   -d '{"agentKey":"assistant","input":"Hello, help me today"}'

# Get memory
curl https://your-site.com/api/agents/memory
```

## Files Created

| File | Type |
|------|------|
| `shared/agent/types.ts` | Core types |
| `shared/agent/index.ts` | Barrel exports |
| `shared/agent/registry.ts` | Agent CRUD |
| `shared/agent/planner.ts` | Task planning |
| `shared/agent/executor.ts` | Step execution |
| `shared/agent/workflow.ts` | DAG workflow engine |
| `shared/agent/memory.ts` | Memory service |
| `functions/api/agents/index.ts` | Agent list/create API |
| `functions/api/agents/[id].ts` | Agent detail API |
| `functions/api/agents/run.ts` | Agent run API |
| `functions/api/agents/tasks/index.ts` | Task list API |
| `functions/api/agents/tasks/[id]/cancel.ts` | Task cancel API |
| `functions/api/agents/tasks/[id]/retry.ts` | Task retry API |
| `functions/api/agents/memory/index.ts` | Memory API |
| `functions/api/agents/workflow.ts` | Workflow execution API |
| `functions/api/admin/agents/index.ts` | Admin agent list |
| `functions/api/admin/agents/[id].ts` | Admin agent update |
| `functions/api/admin/agents/create.ts` | Admin agent create |
| `functions/api/admin/agents/tasks/index.ts` | Admin task list |
| `functions/api/admin/agents/memory/index.ts` | Admin memory stats |
| `src/pages/admin/Agents.tsx` | Admin UI page |
| `admin/agents.tsx` | Admin route wrapper |
| `drizzle/0027_agent_engine.sql` | Database migration |

## Migration Checklist

- [ ] Run `0027_agent_engine.sql` on production D1
- [ ] Verify `agents`, `agent_tasks`, `agent_memory` tables created
- [ ] Verify indexes on `agent_tasks(user_id, status, agent_id)`
- [ ] Seed default agents via admin panel
