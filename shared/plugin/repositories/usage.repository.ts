/** Plugin Usage Repository Interface */
import { PluginUsageModel, PluginUsageCreateInput, PluginUsageType } from "../models/usage";

export interface PluginUsageRepository {
  async record(pluginId: string, userId: string, usageType: PluginUsageType, amount: number): Promise<void>;
  async getTotalByPlugin(pluginId: string): Promise<number>;
  async getByPluginAndUser(pluginId: string, userId: string, usageType?: PluginUsageType): Promise<number>;
  async getHistory(pluginId: string, options?: { limit?: number; startDate?: string; endDate?: string }): Promise<PluginUsageModel[]>;
}