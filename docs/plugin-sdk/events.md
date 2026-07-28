# Plugin Events Documentation

## Event System Overview

The plugin SDK provides an event bus system for inter-plugin communication and interaction with the platform. The `PluginEventEmitter` class implements a simple publish/subscribe model.

## Standard Event Names

The following event names are reserved by the platform:

| Event Name | Description | When Emitted |
|------------|-------------|--------------|
| `plugin.installed` | Triggered when a new plugin is installed | After successful registration |
| `plugin.enabled` | Triggered when a plugin is enabled | After enable operation completes |
| `plugin.disabled` | Triggered when a plugin is disabled | After disable operation completes |
| `plugin.updated` | Triggered when a plugin is updated | After successful version update |
| `plugin.uninstalled` | Triggered when a plugin is uninstalled | Before removal from registry |
| `initialize` | Triggered when plugin instance starts | During plugin initialization |
| `plugin.error` | Triggered when a plugin error occurs | When plugin encounters unrecoverable error |

## Using the Event Bus

### Subscribing to Events

```ts
import { eventEmitter, PluginEventName } from '@platform/plugin-sdk';

// Subscribe to plugin installation events
const unsubscribe = eventEmitter.subscribe('plugin.installed', (payload) => {
  console.log(`Plugin installed: ${payload.pluginId}`);
  // Handle manifest, metadata, etc.
});

// Later, unsubscribe to stop receiving events
unsubscribe();
```

### Emitting Events

Plugins can emit custom events that other plugins or the platform may subscribe to:

```ts
import { eventEmitter } from '@platform/plugin-sdk';

// Emit a custom event
eventEmitter.emit('custom:data-processed', {
  data: { /* payload */ },
  timestamp: new Date().toISOString(),
  metadata: { source: 'my-plugin' }
});
```

## Event Payload Structure

All events follow the `PluginEventPayload<T>` interface:

```ts
export interface PluginEventPayload<T = unknown> {
  eventName: PluginEventName;       // The name of the event
  pluginId?: string;                // Originating plugin ID (optional)
  manifest?: PluginSDKManifest;     // Optional manifest reference
  message?: string;                 // Human-readable message
  data?: T;                         // Custom payload data
  timestamp: string;                // ISO 8601 timestamp
  metadata?: Record<string, unknown>; // Additional metadata
}
```

## Best Practices

- **Keep payloads small**: Event payloads should be reasonable in size to avoid performance issues
- **Use descriptive event names**: Use dot-separated naming conventions (`plugin.image.processed`)
- **Handle listener errors**: Individual listener errors won't affect other listeners, but log them for debugging
- **Unsubscribe appropriately**: Always unsubscribe in `onDisable` or `onUninstall` hooks to prevent memory leaks
- **Be idempotent**: Event handlers should be designed to handle duplicate deliveries gracefully
