/**
 * Plugin Adapters - Integration layer between SDK and platform
 * 
 * Adapters allow the SDK to work with different platform implementations.
 */

export abstract class PluginAdapterBase {
  abstract readonly platformName: string;
  abstract readonly platformVersion: string;
  
  abstract initialize(): Promise<void>;
  abstract shutdown(): Promise<void>;
}

export interface EventAdapter {
  subscribe(eventName: string, handler: (data: unknown) => void): void;
  publish(eventName: string, data: unknown): void;
}

export interface MetricsAdapter {
  increment(name: string, value?: number): Promise<void>;
  gauge(name: string, value: number): Promise<void>;
}

export interface PermissionAdapter {
  check(permission: string): Promise<boolean>;
  require(permission: string): Promise<void>;
}
