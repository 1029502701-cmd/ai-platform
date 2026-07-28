# Plugin Lifecycle Documentation

## Lifecycle Hooks Overview

The Plugin Lifecycle system allows plugins to respond to state changes in the plugin management lifecycle. The `PluginLifecycleHooks` interface defines methods that are called at specific points during a plugin's lifetime.

## Hook Methods

### onInstall(context: LifecycleContext)

Called immediately after a plugin is successfully installed and registered with the platform.

**Typical use cases:**
- Initialize plugin-specific database tables or storage
- Set up initial configuration defaults
- Log installation events

**Example:**
```ts
onInstall(context) {
  context.logger.info(`Installing ${context.manifest.name} v${context.manifest.version}`);
  // Initialize storage, create tables, etc.
}
```

### onEnable(context: LifecycleContext)

Called when a plugin is enabled (transitioning from DISABLED to ENABLED state).

**Typical use cases:**
- Start background workers or scheduled tasks
- Register event listeners
- Load cached data into memory
- Connect to external services

**Example:**
```ts
async onEnable(context) {
  context.logger.info(`Enabling ${context.manifest.name}`);
  // Start background tasks
  this.startBackgroundWorker();
  // Subscribe to relevant events
  context.eventBus.subscribe('user.created', this.handleUserCreated.bind(this));
}
```

### onDisable(context: LifecycleContext)

Called when a plugin is disabled (transitioning from ENABLED to DISABLED state).

**Typical use cases:**
- Stop background workers and scheduled tasks
- Unregister event listeners
- Clean up temporary resources
- Save persistent state

**Example:**
```ts
onDisable(context) {
  context.logger.info(`Disabling ${context.manifest.name}`);
  // Stop background tasks
  this.stopBackgroundWorker();
  // Unsubscribe from events
  this.unsubscribeListeners();
}
```

### onUninstall(context: LifecycleContext)

Called when a plugin is being uninstalled.

**Typical use cases:**
- Remove plugin-specific database tables
- Clean up stored user data
- Release any allocated resources
- Send uninstall notifications

**Example:**
```ts
async onUninstall(context) {
  context.logger.info(`Uninstalling ${context.manifest.name}`);
  // Cleanup storage, delete tables, etc.
  await this.cleanupStorage();
}
```

### onUpdate(context: LifecycleContext)

Called when a plugin is updated to a new version (after the new manifest is registered but before it becomes active).

**Typical use cases:**
- Perform database schema migrations
- Migrate old configuration formats to new ones
- Handle breaking changes between versions
- Notify users about new features

**Example:**
```ts
async onUpdate(context) {
  const oldManifest = await this.getPreviousManifest();
  if (oldManifest.version !== context.manifest.version) {
    // Run migration scripts as needed
    await this.migrateFrom(oldManifest.version, context.manifest.version);
  }
}
```

### initialize(context: LifecycleContext)

Optional initialization method called before the plugin begins handling requests. This is typically called once per plugin instance startup.

**Typical use cases:**
- Load configuration from persistent storage
- Establish connections to external services
- Pre-compute expensive calculations
- Warm up caches

## Lifecycle Context

The `LifecylceContext` object passed to each hook contains:

- `pluginId`: The unique identifier of the plugin
- `manifest`: The current plugin manifest (PluginSDKManifest)
- `timestamp`: ISO 8601 timestamp of when the event occurred

## Compatibility with Platform-012

The SDK's lifecycle hooks are designed to be fully compatible with Platform-012's PluginLifecycleService. When a platform operation triggers a lifecycle event, the corresponding hook method will be invoked on the plugin's implementation.

Plugins can implement these hooks either via the interface methods directly or by extending the `BaseLifecycleHooks` class for a cleaner OOP approach.

See also: [events.md](events.md), [permissions.md](permissions.md).
