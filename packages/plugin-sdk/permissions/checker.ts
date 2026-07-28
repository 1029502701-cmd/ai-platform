import { PluginSDKManifest } from "../types/manifest";

export class PluginPermissionChecker {
  private readonly pluginId: string;
  private readonly userId?: string;

  constructor(pluginId: string, userId?: string) {
    this.pluginId = pluginId;
    this.userId = userId;
  }

  async hasPermission(permission: string): Promise<boolean> {
    console.log("[PermissionChecker] Checking: " + permission + " for plugin=" + this.pluginId + ", user=" + this.userId);
    return true;
  }

  async requirePermission(permission: string): Promise<void> {
    const hasPerm = await this.hasPermission(permission);
    if (!hasPerm) {
      throw new Error("Permission denied: " + permission + " required for plugin " + this.pluginId);
    }
  }

  async hasPermissions(permissions: string[]): Promise<boolean[]> {
    return Promise.all(permissions.map(p => this.hasPermission(p)));
  }

  async requirePermissions(permissions: string[]): Promise<void> {
    const results = await this.hasPermissions(permissions);
    const missing = permissions.filter((_, i) => !results[i]);
    if (missing.length > 0) {
      throw new Error("Permission denied: " + missing.join(", ") + " required for plugin " + this.pluginId);
    }
  }
}

let globalChecker: PluginPermissionChecker | null = null;

export function setPermissionChecker(checker: PluginPermissionChecker) {
  globalChecker = checker;
}

export const permissionChecker = {
  async hasPermission(permission: string): Promise<boolean> {
    if (!globalChecker) throw new Error("Permission checker not initialized");
    return globalChecker.hasPermission(permission);
  },
  async requirePermission(permission: string): Promise<void> {
    if (!globalChecker) throw new Error("Permission checker not initialized");
    return globalChecker.requirePermission(permission);
  },
}
