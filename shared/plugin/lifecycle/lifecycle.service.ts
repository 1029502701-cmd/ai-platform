/** PluginLifecycleService - Manages plugin lifecycle states */
import { PluginManifest, PluginStatus } from "../types";
import { PluginRegistryService } from "../services/registry.service";

export interface LifecycleContext {
  pluginId: string;
  manifest: PluginManifest;
  status: PluginStatus;
  timestamp: string;
}

export class PluginLifecycleService {
  private registry: PluginRegistryService | null = null;

  setRegistry(registry: PluginRegistryService) {
    this.registry = registry;
  }

  async install(manifest: Omit<PluginManifest, "capabilities" | "events" | "metrics" | "billing"> & { billing: any }): Promise<LifecycleContext> {
    if (!this.registry) throw new Error("Registry not set");
    await this.registry.registerPlugin(manifest as PluginManifest);
    const context: LifecycleContext = {
      pluginId: manifest.id,
      manifest,
      status: PluginStatus.INSTALLED,
      timestamp: new Date().toISOString(),
    };
    await this.emitEvent("install", context);
    return context;
  }

  async initialize(pluginId: string): Promise<LifecycleContext> {
    if (!this.registry) throw new Error("Registry not set");
    const manifest = this.registry.getPlugin(pluginId);
    if (!manifest) throw new Error(`Plugin not found: ${pluginId}`);
    const context: LifecycleContext = { pluginId, manifest, status: PluginStatus.INSTALLED, timestamp: new Date().toISOString() };
    await this.emitEvent("initialize", context);
    return context;
  }

  async enable(pluginId: string): Promise<LifecycleContext> {
    if (!this.registry) throw new Error("Registry not set");
    await this.registry.enablePlugin(pluginId);
    const manifest = this.registry.getPlugin(pluginId);
    const context: LifecycleContext = { pluginId, manifest, status: PluginStatus.ENABLED, timestamp: new Date().toISOString() };
    await this.emitEvent("enable", context);
    return context;
  }

  async disable(pluginId: string): Promise<LifecycleContext> {
    if (!this.registry) throw new Error("Registry not set");
    await this.registry.disablePlugin(pluginId);
    const manifest = this.registry.getPlugin(pluginId);
    const context: LifecycleContext = { pluginId, manifest, status: PluginStatus.DISABLED, timestamp: new Date().toISOString() };
    await this.emitEvent("disable", context);
    return context;
  }

  async uninstall(pluginId: string): Promise<LifecycleContext> {
    if (!this.registry) throw new Error("Registry not set");
    await this.registry.removePlugin(pluginId);
    const context: LifecycleContext = { pluginId, manifest: { id: pluginId, name: "", version: "", description: "", author: { name: "" }, capabilities: [], permissions: [], events: [], routes: [], metrics: [], billing: { model: "free" } }, status: PluginStatus.UNINSTALLING, timestamp: new Date().toISOString() };
    await this.emitEvent("uninstall", context);
    return context;
  }

  private async emitEvent(action: string, context: LifecycleContext): Promise<void> {
    console.log(`[Lifecycle] ${action}: ${context.pluginId}`);
  }
}