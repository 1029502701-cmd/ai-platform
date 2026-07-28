# Plugin Permissions Documentation

## Permission System Overview

The plugin SDK provides permission checking capabilities through the `PluginPermissionChecker` class and the global `permissionChecker` utility. Permissions are checked against the platform's authorization model to ensure plugins only access resources they're authorized to use.

## Built-in Permission Checker

### hasPermission(permission: string): Promise<boolean>

Checks whether the current plugin (or user) has a specific permission.

```ts
import { permissionChecker } from '@platform/plugin-sdk';

if (await permissionChecker.hasPermission('storage:get')) {
  // Safe to read from storage
}
```

### requirePermission(permission: string): Promise<void>

Throws an error if the required permission is not granted. Useful for early-fail validation.

```ts
await permissionChecker.requirePermission('storage:put');
// If we reach here, we have permission to write
// Now safely perform storage operation
```

## Permission Types

The following permission patterns are supported by the platform:

| Permission Scope | Example Values | Description |
|-----------------|---------------|-------------|
| Storage operations | `storage:get`, `storage:put`, `storage:delete` | Access to persistent storage |
| Billing/credits | `billing:usage`, `billing:read` | Ability to consume or check credits |
| Queue operations | `queue:submit`, `queue:read` | Access to job queues |
| Connector operations | `connector:read`, `connector:write` | External data connectors |
| Admin permissions | `admin:*` | Administrative operations (restricted) |

Plugins should declare only the permissions they actually need in their manifest's `permissions` array.

## Runtime Permission Checking

Plugins can also obtain an instance of `PluginPermissionChecker` via `PluginContext.permissions`:

```ts
export function initialize(context: PluginContext) {
  // Check multiple permissions at once
  const [hasRead, hasWrite] = await context.permissions.hasPermissions([
    'storage:get',
    'storage:put'
  ]);
  
  if (!hasRead) {
    throw new Error('Plugin requires storage:get permission');
  }
  
  // Use requirePermission for critical operations
  await context.permissions.requirePermission('billing:usage');
}
```

## Permission Validation

During manifest validation, the SDK checks that the `permissions` field is an array of strings. However, actual permission enforcement happens at runtime when the platform invokes the permission checker.

## Security Best Practices

- **Principle of Least Privilege**: Declare only the minimum required permissions
- **Check Before Acting**: Always call `requirePermission()` before sensitive operations
- **Handle Denials Gracefully**: Catch PermissionDenied errors and provide appropriate user feedback
- **Document Permissions**: Clearly explain in your plugin documentation why certain permissions are needed
