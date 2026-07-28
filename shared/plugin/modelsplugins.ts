/**
 * Plugin model - represents a registered plugin
 */

export interface PluginModel {
  id: string; // Primary key, surrogate
  plugin_id: string; // Unique plugin identifier (e.g., "beauty")
  name: string;
  version: string;
  status: PluginStatus; // installed, enabled, disabled, uninstalling
  manifest_json: string; // Serialized PluginManifest
  installed_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export enum PluginStatus {
  INSTALLED = "installed",
  ENABLED = "enabled",
  DISABLED = "disabled",
  UNINSTALLING = "uninstalling",
}

export interface PluginCreateInput {
  plugin_id: string;
  name: string;
  version: string;
  manifest_json: string;
}

export interface PluginUpdateInput {
  status: PluginStatus;
  updated_at: string;
}
