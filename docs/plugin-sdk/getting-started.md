# Plugin SDK - Getting Started

## Quick Start

This guide walks through creating your first plugin using the Plugin Developer SDK.

### Step 1: Create a New Plugin Template

You can generate a new plugin template using the CLI tool:

```bash
npx create-plugin my-awesome-plugin
```

Or manually create the structure following the [Plugin Template Generator](../tools/plugin-template/README.md) specification.

### Step 2: Install the SDK

Your plugin will depend on the platform SDK:

```bash
npm install @platform/plugin-sdk --save
# or
yarn add @platform/plugin-sdk
```

### Step 3: Implement Your Plugin

Create `index.ts` in your plugin directory:

```ts
import { PluginContext, PluginSDKManifest } from '@platform/plugin-sdk';

// Export the manifest
export const manifest: PluginSDKManifest = {
  id: 'my-awesome-plugin',
  name: 'My Awesome Plugin',
  version: '0.1.0',
  description: 'A sample plugin demonstrating SDK usage',
  author: { name: 'Your Name', email: 'your@email.com' },
  category: 'tool',
  permissions: ['storage:get'],
  events: [
    { name: 'plugin.enabled', description: 'Triggered when plugin is enabled' }
  ],
  metrics: [
    { 
      name: 'plugin_usage_total', 
      description: 'Total number of times plugin was used', 
      type: 'count', 
      unit: 'count' 
    }
  ],
  metrics: [
    { name: 'usage_count', description: 'Usage count', type: 'counter', unit: 'count' }
  ],
  dependencies: {}
};

// Initialize the plugin
export function initialize(context: PluginContext) {
  context.logger.info('My Awesome Plugin initialized');
  
  // Subscribe to events
  context.eventBus.subscribe('plugin.enabled', (payload) => {
    context.logger.info(`Plugin enabled for user: ${payload.pluginId}`);
  });
  
  // Record metrics
  context.metrics.increment('usage_count');
}
```

### Step 4: Build and Package

Build your plugin using your preferred TypeScript compiler:

```bash
tsc --outDir dist
```

Package as a ZIP file containing the `manifest.json`, compiled JavaScript, and any static assets.

### Step 5: Register with Platform

Use the Platform-012 Plugin Management Layer to register your plugin:

```bash
# Via admin API or management console
curl -X POST /api/plugins/register \
  -H "Authorization: Bearer <token>" \
  -F "@your-plugin.zip"
```

See [manifest.md](manifest.md) for full manifest specification details.
