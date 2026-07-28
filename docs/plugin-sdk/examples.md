# Plugin SDK Examples

## Example 1: Simple "Hello World" Plugin

```ts
// index.ts
import { PluginContext, PluginSDKManifest } from '@platform/plugin-sdk';

export const manifest: PluginSDKManifest = {
  id: 'hello-world',
  name: 'Hello World Plugin',
  version: '0.1.0',
  description: 'A simple hello world plugin demonstrating basic SDK usage',
  author: { name: 'Developer', email: 'dev@example.com' },
  category: 'tool',
  permissions: [],
  events: [
    { name: 'plugin.enabled', description: 'Triggered when enabled' }
  ],
  metrics: [
    { name: 'greeting_count', description: 'Number of greetings issued', type: 'counter', unit: 'count' }
  ],
  dependencies: {}
};

export function initialize(context: PluginContext) {
  context.logger.info('Hello World plugin initialized');
  
  // Count usage
  context.metrics.increment('greeting_count');
  
  // Respond to enable event
  context.eventBus.subscribe('plugin.enabled', (payload) => {
    context.logger.info('Hello World plugin is now enabled!');
  });
}
```

## Example 2: Plugin with Storage Permission

```ts
import { PluginContext, PluginSDKManifest } from '@platform/plugin-sdk';

export const manifest: PluginSDKManifest = {
  id: 'data-storer',
  name: 'Data Storer',
  version: '0.1.0',
  description: 'Plugin that stores user data using storage permissions',
  author: { name: 'Developer' },
  category: 'storage',
  permissions: ['storage:get', 'storage:put'],
  events: [],
  metrics: [
    { name: 'storage_operations', description: 'Total storage operations', type: 'counter', unit: 'count' }
  ],
  dependencies: {}
};

export async function initialize(context: PluginContext) {
  // Require storage permission before proceeding
  await context.permissions.requirePermission('storage:put');
  
  context.logger.info('Data Storer plugin ready');
  
  // Track storage operations
  let operationCount = 0;
  const originalStoragePut = context.metrics.increment.bind(context.metrics);
  
  context.metrics = new Proxy(context.metrics, {
    target: context.metrics,
    increment(target, name, amount = 1) {
      if (name === 'storage_operations') operationCount++;
      return target.increment(name, amount);
    }
  });
}
```

## Example 3: Plugin with Lifecycle Hooks

```ts
import { PluginContext, PluginSDKManifest, BaseLifecycleHooks } from '@platform/plugin-sdk';

export const manifest: PluginSDKManifest = { /* ... */ };

class MyPluginHooks extends BaseLifecycleHooks {
  async onInstall(context: LifecycleContext) {
    console.log(`Installing ${context.manifest.name}`);
    // Initialize database schema, etc.
  }
  
  async onEnable(context: LifecycleContext) {
    console.log(`Enabling ${context.manifest.name}`);
    // Start background workers
  }
  
  async onDisable(context: LifecycleContext) {
    console.log(`Disabling ${context.manifest.name}`);
    // Clean up resources
  }
}

export function initialize(context: PluginContext) {
  context.hooks = new MyPluginHooks();
  context.logger.info('Plugin initialized with custom hooks');
}
```

## Example 4: Plugin Reporting Custom Metrics

```ts
import { PluginContext, PluginSDKManifest, StandardMetricNames } from '@platform/plugin-sdk';

export const manifest: PluginSDKManifest = {
  // ...
  metrics: [
    { 
      name: StandardMetricNames.USAGE_TOTAL, 
      description: 'Total plugin invocations', 
      type: 'counter', 
      unit: 'count' 
    },
    {
      name: 'response_time_ms',
      description: 'Average response time in milliseconds',
      type: 'gauge',
      unit: 'ms'
    }
  ]
};

export async function initialize(context: PluginContext) {
  // Wrap a function to automatically measure execution time
  const processed = await context.around(async () => {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 150));
    return { result: 'processed' };
  }, 'api.process');
  
  context.logger.info(`Processing complete:`, processed);
}
```

## Example 5: Using the Template Generator

To quickly scaffold a new plugin, use the template generator:

```bash
# Create a new plugin directory
npx create-plugin my-cool-plugin

# Or run locally from the repository
node tools/plugin-template/generate.js my-cool-plugin

# This creates:
# my-cool-plugin/
#   ©À©¤©¤ manifest.json
#   ©À©¤©¤ index.ts
#   ©À©¤©¤ services/
#   ©À©¤©¤ routes/
#   ©À©¤©¤ events/
#   ©¸©¤©¤ README.md
```

See also: [architecture.md](architecture.md), [lifecycle.md](lifecycle.md).
