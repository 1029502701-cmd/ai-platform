/**
 * Plugin Registry — dynamic plugin system for the AI Ecosystem.
 */

export type PluginType = 'tool' | 'knowledge' | 'workflow' | 'provider' | 'billing' | 'connector';

export interface PluginDef {
  key: string;
  name: string;
  version: string;
  type: PluginType;
  entryPoint: string;
  description?: string;
  config?: Record<string, unknown>;
  permissions?: string[];
  enabled: boolean;
}

export interface PluginInstance extends PluginDef {
  instanceId: string;
  loadedAt: string;
  metadata: Record<string, unknown>;
}

export class PluginRegistry {
  private plugins = new Map<string, PluginInstance>();

  static get instance(): PluginRegistry { return PluginRegistry._instance ?? (PluginRegistry._instance = new PluginRegistry()); }
  private static _instance: PluginRegistry | null = null;

  async register(key: string, def: PluginDef): Promise<boolean> {
    if (this.plugins.has(key)) return false;
    const instance: PluginInstance = {
      ...def,
      instanceId: `${key}@${def.version}`,
      loadedAt: new Date().toISOString(),
      metadata: {},
    };
    try {
      const mod = await import(def.entryPoint);
      if (mod && typeof mod === 'object') { instance.metadata.loaded = true; }
    } catch { instance.metadata.loaded = false; }
    this.plugins.set(key, instance);
    return true;
  }

  get(key: string): PluginInstance | undefined { return this.plugins.get(key); }

  list(filter?: { type?: PluginType; enabledOnly?: boolean }): PluginInstance[] {
    let result = Array.from(this.plugins.values());
    if (filter?.type) result = result.filter(p => p.type === filter.type);
    if (filter?.enabledOnly) result = result.filter(p => p.enabled);
    return result;
  }

  isEnabled(key: string): boolean {
    const p = this.plugins.get(key);
    return !!p?.enabled;
  }

  disable(key: string): boolean {
    const p = this.plugins.get(key);
    if (!p) return false;
    p.enabled = false;
    return true;
  }

  enable(key: string): boolean {
    const p = this.plugins.get(key);
    if (!p) return false;
    p.enabled = true;
    return true;
  }

  uninstall(key: string): boolean { return this.plugins.delete(key); }

  async executeTool(key: string, params: Record<string, unknown>): Promise<unknown> {
    const p = this.plugins.get(key);
    if (!p || !p.enabled) throw new Error(`Plugin "${key}" not found or disabled`);
    if (!p.metadata.loaded) throw new Error(`Plugin "${key}" entry point failed to load`);
    try {
      const mod = await import(p.entryPoint);
      if (typeof mod.execute === 'function') return mod.execute(params);
      throw new Error(`Plugin "${key}" has no execute() function`);
    } catch (e) {
      throw new Error(`Plugin "${key}" execution failed: ${(e as Error).message}`);
    }
  }

  get count(): number { return this.plugins.size; }
}