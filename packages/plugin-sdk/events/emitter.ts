import { PluginSDKManifest } from '../types/manifest';

export type PluginEventName =
  | 'plugin.installed'
  | 'plugin.enabled'
  | 'plugin.disabled'
  | 'plugin.updated'
  | 'plugin.uninstalled'
  | 'plugin.error'
  | 'initialize';

export interface PluginEventPayload<T = unknown> {
  eventName: PluginEventName;
  pluginId?: string;
  manifest?: PluginSDKManifest;
  message?: string;
  data?: T;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export class PluginEventEmitter {
  private listeners = new Map<PluginEventName, Array<(payload: PluginEventPayload)>>();

  subscribe(eventName: PluginEventName, listener: (payload: PluginEventPayload) => void) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    const list = this.listeners.get(eventName)!;
    list.push(listener);
    return () => {
      const idx = list.indexOf(listener);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  emit(eventName: PluginEventName, payload: Omit<PluginEventPayload, 'eventName'>) {
    const eventPayload: PluginEventPayload = {
      eventName,
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
    };
    const listeners = this.listeners.get(eventName) || [];
    for (const listener of listeners) {
      try {
        listener(eventPayload);
      } catch (error) {
        console.error('[PluginEventEmitter] Error in listener:', error);
      }
    }
  }

  hasSubscribers(eventName: PluginEventName): boolean {
    return this.listeners.has(eventName) && this.listeners.get(eventName)?.length > 0;
  }

  clear(eventName: PluginEventName) {
    this.listeners.delete(eventName);
  }

  getEventNames(): PluginEventName[] {
    return Array.from(this.listeners.keys()) as PluginEventName[];
  }
}

export const eventEmitter = new PluginEventEmitter();
