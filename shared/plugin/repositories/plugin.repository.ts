/** Plugin Repository Interface */
import { PluginModel, PluginCreateInput, PluginUpdateInput } from "../models/plugins";

export interface PluginRepository {
  async create(input: PluginCreateInput): Promise<PluginModel>;
  async get(id: string): Promise<PluginModel | null>;
  async getByPluginId(pluginId: string): Promise<PluginModel | null>;
  async list(): Promise<PluginModel[]>;
  async enable(id: string): Promise<boolean>;
  async disable(id: string): Promise<boolean>;
  async update(id: string, input: PluginUpdateInput): Promise<boolean>;
  async remove(id: string): Promise<boolean>;
  async exists(pluginId: string): Promise<boolean>;
}