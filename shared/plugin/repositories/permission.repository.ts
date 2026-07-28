/** Plugin Permission Repository Interface */
export interface PluginPermissionRepository {
  async add(pluginId: string, permission: string): Promise<void>;
  async getPermissions(pluginId: string): Promise<string[]>;
  async hasPermission(pluginId: string, permission: string): Promise<boolean>;
  async remove(pluginId: string, permission: string): Promise<void>;
  async clear(pluginId: string): Promise<void>;
}