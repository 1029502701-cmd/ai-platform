/**
 * PluginRegistryService - Core plugin registry implementation
 */

import { PluginManifest, PluginStatus } from "../types";
import { PluginModel } from "../models/plugins";

export class PluginRegistryService {
  private plugins = new Map<string, PluginManifest>();
  private pluginModels = new Map<string, PluginModel>();
  private db: any;

  constructor(config: { db: any }) {
    this.db = config.db;
  }

  async registerPlugin(manifest: PluginManifest): Promise<boolean> {
    if (this.plugins.has(manifest.id)) {
      return false;
    }

    const now = new Date().toISOString();
    this.plugins.set(manifest.id, manifest);

    const model: PluginModel = {
      id: "plugin_" + manifest.id + "_" + now,
      plugin_id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      status: PluginStatus.INSTALLED,
      manifest_json: JSON.stringify(manifest),
      installed_at: now,
      updated_at: now,
    };
    this.pluginModels.set(manifest.id, model);

    return true;
  }

  getPlugin(id: string): PluginManifest | null {
    return this.plugins.get(id) || null;
  }

  listPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  async enablePlugin(id: string): Promise<boolean> {
    const m = this.pluginModels.get(id);
    if (!m) return false;
    if (m.status === PluginStatus.ENABLED) return true;
    m.status = PluginStatus.ENABLED;
    m.updated_at = new Date().toISOString();
    return true;
  }

  async disablePlugin(id: string): Promise<boolean> {
    const m = this.pluginModels.get(id);
    if (!m) return false;
    if (m.status === PluginStatus.DISABLED) return true;
    m.status = PluginStatus.DISABLED;
    m.updated_at = new Date().toISOString();
    return true;
  }

  async removePlugin(id: string): Promise<boolean> {
    if (!this.plugins.has(id)) return false;
    this.plugins.delete(id);
    this.pluginModels.delete(id);
    return true;
  }

  async checkPluginPermission(pluginId: string, permission: string): Promise<boolean> {
    const manifest = this.plugins.get(pluginId);
    return manifest ? manifest.permissions?.includes(permission) : false;
  }
}
