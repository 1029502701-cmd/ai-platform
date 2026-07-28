/** Plugin model - represents a registered plugin */
export interface PluginModel {
  id: string;
  plugin_id: string;
  name: string;
  version: string;
  status: PluginStatus;
  manifest_json: string;
  installed_at: string;
  updated_at: string;
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