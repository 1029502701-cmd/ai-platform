/**
 * PluginLifecycleHooks - Standard lifecycle hook interface for plugin developers
 * 
 * These methods are invoked by the platform at specific lifecycle points.
 * Plugin authors can override these hooks to implement custom behavior.
 */

import { PluginSDKManifest } from '../types/manifest';

export interface LifecycleContext {
  /** Plugin ID */
  pluginId: string;
  /** Plugin manifest */
  manifest: PluginSDKManifest;
  /** Current timestamp */
  timestamp: string;
}

/**
 * Lifecycle hooks interface - plugin developer can implement these methods
 * to respond to platform lifecycle events.
 */
export interface PluginLifecycleHooks {
  /**
   * Called when the plugin is installed.
   * @param context Lifecycle context with manifest and pluginId
   * @returns Promise for async operations
   */
  onInstall?(context: LifecycleContext): Promise<void>;

  /**
   * Called when the plugin is enabled.
   * @param context Lifecycle context with manifest and pluginId
   * @returns Promise for async operations
   */
  onEnable?(context: LifecycleContext): Promise<void>;

  /**
   * Called when the plugin is disabled.
   * @param context Lifecycle context with manifest and pluginId
   * @returns Promise for async operations
   */
  onDisable?(context: LifecycleContext): Promise<void>;

  /**
   * Called when the plugin is uninstalled.
   * @param context Lifecycle context with manifest and pluginId
   * @returns Promise for async operations
   */
  onUninstall?(context: LifecycleContext): Promise<void>;

  /**
   * Called when the plugin is updated (new version installed).
   * @param context Lifecycle context with new manifest and pluginId
   * @returns Promise for async operations
   */
  onUpdate?(context: LifecycleContext): Promise<void>;

  /**
   * Optional initialization called before first use.
   * @param context Lifecycle context with manifest and pluginId
   * @returns Promise for async operations
   */
  initialize?(context: LifecycleContext): Promise<void>;
}

/**
 * Default no-op implementation of PluginLifecycleHooks.
 * Plugin developers can extend this class if they prefer OOP style.
 */
export class BaseLifecycleHooks implements PluginLifecycleHooks {
  async onInstall(_context: LifecycleContext): Promise<void> {}
  async onEnable(_context: LifecycleContext): Promise<void> {}
  async onDisable(_context: LifecycleContext): Promise<void> {}
  async onUninstall(_context: LifecycleContext): Promise<void> {}
  async onUpdate(_context: LifecycleContext): Promise<void> {}
  async initialize(_context: LifecycleContext): Promise<void> {}
}
