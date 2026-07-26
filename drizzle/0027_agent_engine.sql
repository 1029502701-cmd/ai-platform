-- Agent Registry Tables
-- Task-014: Agent Engine & Workflow Platform

CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    default_model TEXT DEFAULT 'openai-gpt-4o-mini',
    default_prompt TEXT,
    max_steps INTEGER DEFAULT 10,
    knowledge_base_id INTEGER,
    tools TEXT,
    config TEXT,
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agents_key ON agents(key);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Agent Tasks
CREATE TABLE IF NOT EXISTS agent_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    agent_id INTEGER NOT NULL REFERENCES agents(id),
    workflow_id INTEGER,
    input_data TEXT,
    status TEXT DEFAULT 'pending',
    current_step TEXT,
    steps_completed INTEGER DEFAULT 0,
    total_steps INTEGER DEFAULT 0,
    result TEXT,
    error TEXT,
    started_at DATETIME,
    finished_at DATETIME,
    duration_ms INTEGER,
    created_at DATETIME DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_id);

-- Agent Memory
CREATE TABLE IF NOT EXISTS agent_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    task_id INTEGER,
    memory_type TEXT DEFAULT 'conversation',
    content TEXT,
    metadata TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT (datetime('now'));

CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_task ON agent_memory(task_id);

-- Agent Workflows
CREATE TABLE IF NOT EXISTS agent_workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL REFERENCES agents(id),
    name TEXT NOT NULL,
    description TEXT,
    definition TEXT,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'));

-- Agent Workflow Nodes
CREATE TABLE IF NOT EXISTS agent_workflow_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    node_type TEXT NOT NULL,
    config TEXT,
    display_name TEXT,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT (datetime('now'));

-- Agent Workflow Edges
CREATE TABLE IF NOT EXISTS agent_workflow_edges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL REFERENCES agent_workflows(id) ON DELETE CASCADE,
    source_node_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    condition_expression TEXT,
    created_at DATETIME DEFAULT (datetime('now'));