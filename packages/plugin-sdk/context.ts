/**
 * PluginContext - Main developer-facing API for plugins
 * 
 * Provides access to logging, eventing, metrics, and billing services
 * from within a plugin implementation.
 */

import { PluginSDKManifest } from './types/manifest';
import { PluginLifecycleHooks } from './lifecycle/hooks';
import { PluginEventEmitter, eventEmitter } from './events/emitter';
import { PluginPermissionChecker, permissionChecker } from './permissions/checker';
import { PluginMetricsClient, metrics } from './metrics/client';

export interface PluginContext {
  readonly pluginId: string;
  readonly userId?: string;
  readonly logger: {
    info: (msg: string, data?: Record<string, unknown>) => void;
    warn: (msg: string, data?: Record<string, unknown>) => void;
    error: (msg: string, err: unknown, data?: Record<string, unknown>) => void;
    debug: (msg: string, data?: Record<string, unknown>) => void;
  };
  readonly eventBus: PluginEventEmitter;
  readonly metrics: PluginMetricsClient;
  readonly billing: {
    consume(amount: number, description: string): Promise<boolean>;
    getBalance(): Promise<number>;
  };
  readonly hooks: PluginLifecycleHooks;
  readonly manifest: PluginSDKManifest;
  readonly permissions: PluginPermissionChecker;
}

export class PluginContextImpl implements PluginContext {
  constructor(
    public readonly pluginId: string,
    public readonly userId?: string,
    public readonly manifest: PluginSDKManifest,
    private _logger: object,
    private _eventBus: PluginEventEmitter,
    private _metrics: PluginMetricsClient,
    private _billing: object,
    private _hooks: PluginLifecycleHooks,
    private _permissions: PluginPermissionChecker
  ) {}

  get logger() {
    return {
      info: (msg: string, data?: Record<string, unknown>) => {
        console.log(`[${this.pluginId}] INFO:`, msg, data);
      },
      warn: (msg: string, data?: Record<string, unknown>) => {
        console.warn(`[${this.pluginId}] WARN:`, msg, data);
      },
      error: (msg: string, err: unknown, data?: Record<string, unknown>) => {
        console.error(`[${this.pluginId}] ERROR:`, msg, err, data);
      },
      debug: (msg: string, data?: Record<string, unknown>) => {
        console.debug(`[${this.pluginId}] DEBUG:`, msg, data);
      },
    };
  }

  get eventBus() { return this._eventBus; }
  get metrics() { return this._metrics; }
  get billing() { 
    return {
      consume: async (amount: number, description: string): Promise<boolean> => {
        console.log(`[Billing][${this.pluginId}] Consumed: ${amount} for "${description}"`);
        return true;
      },
      getBalance: async (): Promise<number> => {
        console.log(`[Billing][${this.pluginId}] Getting balance`);
        return 1000;
      },
    };
  }
  get hooks() { return this._hooks; }
  get permissions() { return this._permissions; }
}

export function createPluginContext(
  pluginId: string,
  manifest: PluginSDKManifest,
  userId?: string,
  hooks?: PluginLifecycleHooks,
  metricsClient?: PluginMetricsClient,
  permissionChecker?: PluginPermissionChecker
): PluginContext {
  return new PluginContextImpl(
    pluginId,
    userId,
    manifest,
    console,
    eventEmitter,
    metricsClient || new PluginMetricsClient(pluginId),
    {},
    hooks || new (class BaseLifecycleHooks implements PluginLifecycleHooks {
      async onInstall() {}
      async onEnable() {}
      async onDisable() {}
      async onUninstall() {}
      async onUpdate() {}
      async initialize() {}
    }),
    permissionChecker || new PluginPermissionChecker(pluginId)
  );
}

let globalContext: PluginContext | null = null;

export function setPluginContext(ctx: PluginContext) {
  globalContext = ctx;
}

export const context = {
  get(): PluginContext {
    if (!globalContext) throw new Error('Plugin context not initialized');
    return globalContext;
  }
}
