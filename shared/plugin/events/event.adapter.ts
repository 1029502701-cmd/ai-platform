/** Plugin Event Adapter */
export type PluginEventName =
  | "plugin.installed"
  | "plugin.enabled"
  | "plugin.disabled"
  | "plugin.error"
  | "plugin.initialize"
  | "plugin.uninstall";

export interface PluginEventPayload {
  eventName: PluginEventName;
  pluginId?: string;
  manifest?: any;
  message?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export class PluginEventAdapter {
  private listeners = new Map<PluginEventName, ((payload: PluginEventPayload) => void)[]>();

  on(eventName: PluginEventName, listener: (payload: PluginEventPayload) => void) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    const list = this.listeners.get(eventName)!;
    list.push(listener);
  }

  emit(eventName: PluginEventName, payload: Omit<PluginEventPayload, "eventName">) {
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
        console.error(error);
      }
    }
    if (listeners.length === 0) {
      console.log(`[PluginEvent] ${eventName}:`, payload);
    }
  }
}

export const eventAdapter = new PluginEventAdapter();