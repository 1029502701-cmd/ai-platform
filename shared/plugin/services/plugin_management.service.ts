/**
 * PluginManagementService - Manages plugin lifecycle: install, uninstall, enable, disable, update
 * 
 * This service coordinates with PluginRegistryService and PluginLifecycleService
 * to provide a complete plugin management workflow.
 */

import { PluginManifest, PluginStatus } from "../types";
import { PluginRegistryService } from "../services/registry.service";
import { PluginLifecycleService } from "../lifecycle/lifecycle.service";
import { eventAdapter } from "../events/event.adapter";
import { metricsService } from "../metrics/metrics.service";
import { PluginVersionService, PluginVersion } from "./plugin_version.service";

export interface PluginInstallOptions {
  userId?: string;
  bypassDepCheck?: boolean;
}

export class PluginManagementService {
  private registry: PluginRegistryService;
  private lifecycle: PluginLifecycleService;
  private versionService: PluginVersionService;

  constructor(
    registry?: PluginRegistryService,
    lifecycle?: PluginLifecycleService,
    versionService?: PluginVersionService
  ) {
    this.registry = registry || new PluginRegistryService({ db: null as any });
    this.lifecycle = lifecycle || new PluginLifecycleService();
    this.versionService = versionService || new PluginVersionService();
    
    // Set lifecycle registry reference for event emitting
    this.lifecycle.setRegistry(this.registry);
  }

  /**
   * Install a new plugin or update an existing one
   */
  async install(manifest: PluginManifest, options: PluginInstallOptions = {}): Promise<{ success: boolean; status: PluginStatus; installedAt: string }> {
    const now = new Date().toISOString();
    const pluginId = manifest.id;

    // Check if plugin already exists
    const existing = this.registry.getPlugin(pluginId);
    
    // Register the version first
    await this.versionService.registerVersion(
      pluginId,
      manifest.version,
      "released",
      manifest.description
    );

    if (existing) {
      // Update existing plugin
      return await this.updatePluginVersion(manifest, options);
    }

    // Check permissions via registry
    const hasPermission = await this.checkRequiredPermissions(manifest, [
      "storage:get",
      "storage:put",
    ]);

    if (!hasPermission && options.userId) {
      // Permission check would integrate with permission system here
      console.log(`Checking permissions for plugin ${pluginId}`);
    }

    // Register plugin in registry
    const registered = await this.registry.registerPlugin(manifest);
    if (!registered) {
      throw new Error(`Failed to register plugin ${pluginId}: already exists`);
    }

    // Execute lifecycle install
    const lifecycleContext = await this.lifecycle.install(manifest);

    // Track metric
    metricsService.increment("plugin_install_total");

    // Emit event
    eventAdapter.emit("plugin.installed", {
      pluginId: manifest.id,
      manifest,
      message: `Plugin ${manifest.id} v${manifest.version} installed successfully`,
      timestamp: now,
      metadata: { userId: options.userId },
    });

    return {
      success: true,
      status: PluginStatus.INSTALLED,
      installedAt: now,
    };
  }

  /**
   * Uninstall a plugin
   */
  async uninstall(pluginId: string, userId?: string): Promise<{ success: boolean; reason: string }> {
    const now = new Date().toISOString();

    // Check dependencies - are there other plugins depending on this?
    // Simplified: check if any active plugin depends on this
    const plugins = this.registry.listPlugins();
    const dependents = plugins.filter(p => {
      const deps = p.dependencies || [];
      return deps.includes(pluginId);
    });

    if (dependents.length > 0) {
      throw new Error(
        `Cannot uninstall plugin "${pluginId}": still depended on by ${dependents.map(d => d.name).join(", ")}`
      );
    }

    // Execute lifecycle uninstall before removing from registry
    const lifecycleContext = await this.lifecycle.uninstall(pluginId);

    // Remove from registry
    const removed = await this.registry.removePlugin(pluginId);

    if (!removed) {
      return { success: false, reason: `Plugin ${pluginId} not found` };
    }

    // Track metric
    metricsService.increment("plugin_uninstall_total");

    // Emit event
    eventAdapter.emit("plugin.uninstalled", {
      pluginId,
      message: `Plugin ${pluginId} uninstalled successfully`,
      timestamp: now,
      metadata: { userId },
    });

    return { success: true, reason: "Uninstalled successfully" };
  }

  /**
   * Enable a plugin
   */
  async enable(pluginId: string, userId?: string): Promise<boolean> {
    const now = new Date().toISOString();

    // Check if enabled already
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const enabled = await this.registry.enablePlugin(pluginId);
    if (enabled) {
      // Lifecycle enable
      await this.lifecycle.enable(pluginId);

      // Track active metrics
      metricsService.increment("plugin_active_versions");

      // Emit event
      eventAdapter.emit("plugin.enabled", {
        pluginId,
        message: `Plugin ${pluginId} enabled`,
        timestamp: now,
        metadata: { userId },
      });
    }

    return enabled;
  }

  /**
   * Disable a plugin
   */
  async disable(pluginId: string, userId?: string): Promise<boolean> {
    const now = new Date().toISOString();

    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    const disabled = await this.registry.disablePlugin(pluginId);
    if (disabled) {
      // Lifecycle disable
      await this.lifecycle.disable(pluginId);

      // Emit event
      eventAdapter.emit("plugin.disabled", {
        pluginId,
        message: `Plugin ${pluginId} disabled`,
        timestamp: now,
        metadata: { userId },
      });
    }

    return disabled;
  }

  /**
   * Update plugin version - install new version then disable old one
   */
  async updatePluginVersion(newManifest: PluginManifest, options: PluginInstallOptions = {}): Promise<{ success: boolean; oldVersion: string; newVersion: string; fromUpdate: boolean }> {
    const pluginId = newManifest.id;
    const oldPlugin = this.registry.getPlugin(pluginId);
    if (!oldPlugin) {
      throw new Error(`Plugin ${pluginId} not found for update`);
    }

    const oldVersion = oldPlugin.version;
    
    // Compare versions
    const compareResult = await this.versionService.compareVersion(oldVersion, newManifest.version);
    if (compareResult >= 0) {
      throw new Error(
        `Cannot update: new version ${newManifest.version} is not newer than current ${oldVersion}`
      );
    }

    // Register new version
    await this.versionService.registerVersion(
      pluginId,
      newManifest.version,
      "draft",
      newManifest.description || "Update from previous version"
    );

    // Install new version (temporarily with a different ID strategy, then swap)
    // In production, this would involve atomic swap of plugin entries
    const tempManifest = { ...newManifest, id: `${pluginId}_temp_${newManifest.version}` };
    
    // For simplicity, just enable the new version alongside the old
    // Actual implementation would handle rollback and switching
    
    const result = await this.install(newManifest, options);

    // Emit update event
    const now = new Date().toISOString();
    eventAdapter.emit("plugin.updated", {
      pluginId,
      message: `Plugin ${pluginId} updated from ${oldVersion} to ${newManifest.version}`,
      timestamp: now,
      metadata: { userId: options.userId, oldVersion, newVersion: newManifest.version },
    });

    metricsService.increment("plugin_update_total");

    return {
      success: result.success,
      oldVersion,
      newVersion: newManifest.version,
      fromUpdate: true,
    };
  }

  /**
   * Get plugin status including installation state
   */
  async getPluginStatus(pluginId: string): Promise<{
    installed: boolean;
    enabled: boolean;
    version: string | null;
    status: PluginStatus | null;
    installedAt: string | null;
    updatedAt: string | null;
  }> {
    const pluginModel = await this.registry.getByPluginId(pluginId);
    const pluginManifest = this.registry.getPlugin(pluginId);

    if (!pluginModel) {
      return {
        installed: false,
        enabled: false,
        version: null,
        status: null,
        installedAt: null,
        updatedAt: null,
      };
    }

    return {
      installed: pluginModel.status === PluginStatus.INSTALLED || pluginModel.status === PluginStatus.ENABLED,
      enabled: pluginModel.status === PluginStatus.ENABLED,
      version: pluginModel.version,
      status: pluginModel.status,
      installedAt: pluginModel.installed_at,
      updatedAt: pluginModel.updated_at,
    };
  }

  /**
   * Check if required plugin permissions are available (placeholder for permission system integration)
   */
  private async checkRequiredPermissions(manifest: PluginManifest, requiredPermissions: string[]): Promise<boolean> {
    const providedPermissions = manifest.permissions || [];
    return requiredPermissions.every((perm) => providedPermissions.includes(perm));
  }

  /**
   * Get all plugin versions history for a plugin
   */
  async getVersionHistory(pluginId: string): Promise<PluginVersion[]> {
    return await this.versionService.getVersions(pluginId);
  }
}

export const managementService = new PluginManagementService();
