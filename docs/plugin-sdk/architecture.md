# Plugin SDK Architecture

## Overview

The Plugin Developer SDK provides a standardized interface for building AI plugins that integrate seamlessly with the Platform-011 (Plugin Manifest) and Platform-012 (Plugin Management Layer) ecosystem.

## Design Principles

- **Compatibility**: All types and interfaces are fully compatible with Platform-011 Plugin Manifest specification
- **No Duplication**: The SDK does not reimplement Plugin Registry or Plugin Management logic - it only exposes the necessary interfaces and utilities
- **Modular**: Each SDK component (lifecycle, events, permissions, metrics) is separately versioned and maintainable
- **TypeScript First**: Strict TypeScript typing throughout the API surface

## Component Architecture

```
©°©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©´
©¦    Plugin Developer SDK     ©¦
©À©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©È
©¦  ©°©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©´   ©¦
©¦  ©¦    PluginContext     ©¦   ©¦¡û Main entry point for plugin code
©¦  ©À©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©È   ©¦
©¦  ©¦  Types/Manifest      ©¦   ©¦¡ú PluginSDKManifest type
©¦  ©À©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©È   ©¦
©¦  ©¦ Lifecycle/Hooks      ©¦   ¡ú PluginLifecycleHooks interface
©¦  ©À©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©È   ©¦
©¦  ©¦ Events/Emitter       ©¦   ¡ú PluginEventEmitter class
©¦  ©À©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©È   ©¦
©¦  ©¦ Permissions/Checker  ©¦   ¡ú PluginPermissionChecker class
©¦  ©À©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©È   ©¦
©¦  ©¦ Metrics/Client       ©¦   ¡ú PluginMetricsClient class
©¦  ©À©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©È   ©¦
©¦  ©¦ Adapters             ©¦   ¡ú Platform adapter interfaces
©¦  ©¸©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¼   ©¦
©¸©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¤©¼
```

## Manifest Compatibility

The `PluginSDKManifest` type is defined as:

```ts
type PluginSDKManifest = Omit<PluginManifest, "capabilities"> & {
  id: string;
  name: string;
  version: string;
  description: string;
  author: { name: string; email?: string; url?: string; };
  category: string;
  permissions: string[];
  events: { name: string; description: string; schema?: unknown }[];
  metrics: { name: string; description: string; type: string; unit: string }[];
  dependencies?: Record<string, string>;
};
```

This ensures complete compatibility with the Platform-011 manifest structure while removing the `capabilities` field which is managed by the platform.

## Key APIs

### PluginContext

The primary interface available to plugin developers. Provides access to:

- `logger`: Standard logging (info, warn, error, debug)
- `eventBus`: Event emission and subscription
- `metrics`: Collection of plugin metrics
- `billing`: Usage tracking and credit consumption
- `permissions`: Permission checking at runtime
- `hooks`: Lifecycle hook methods for custom behavior

### PluginLifecycleHooks

Methods called by the platform at specific lifecycle events:

- `onInstall()` - Called when plugin is first installed
- `onEnable()` - Called when plugin is enabled
- `onDisable()` - Called when plugin is disabled
- `onUninstall()` - Called when plugin is being uninstalled
- `onUpdate()` - Called when plugin is updated to a new version

See `lifecycle/hooks.ts` for full details.

See also: [manifest.md](manifest.md), [lifecycle.md](lifecycle.md), [events.md](events.md), [permissions.md](permissions.md), [examples.md](examples.md).
