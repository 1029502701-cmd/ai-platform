# Plugin SDK Guide

## Architecture
Plugins are dynamically loaded modules that extend the AI Platform capabilities.

## Plugin Types
- `tool` — AI tool calling (calculator, search, database query)
- `knowledge` — RAG knowledge sources
- `workflow` — Custom workflow nodes
- `provider` — New AI provider adapters
- `billing` — Custom pricing rules
- `connector` — Third-party integrations

## Creating a Plugin

```typescript
// shared/plugins/my-plugin/index.ts
import { getLogger } from "../../logger";

const log = getLogger("my_plugin");

export async function execute(params: Record<string, unknown>): Promise<unknown> {
  log.info("My plugin executing", params);
  return { result: "done" };
}

export const metadata = {
  version: "1.0.0",
  description: "Example plugin",
};
```

## Registering a Plugin

```typescript
import { PluginRegistry } from "../../plugin-registry/types";

const registry = PluginRegistry.instance;
await registry.register("my-plugin", {
  key: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",
  type: "tool",
  entryPoint: "../../plugins/my-plugin/index.ts",
  enabled: true,
});
```

## Using a Plugin

```typescript
const result = await registry.executeTool("my-plugin", { param: "value" });
```