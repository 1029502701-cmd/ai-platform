import { jsonResponse } from '../../../_auth';
import type { PagesFunction } from '@cloudflare/workers-types';
import { PluginCatalogService } from '../../../../shared/plugin/services/plugin_catalog.service';

export const onRequestGet = async (context) => {
  const { env, request, params } = context;
  const pluginId = params?.id;
  
  if (!pluginId) return jsonResponse({ code: 'INVALID_PARAMS', message: 'Plugin ID is required' }, 400);
  
  const catalog = new PluginCatalogService(env.DB);
  
  try {
    const plugin = await catalog.getPluginDetail(pluginId);
    if (!plugin) return jsonResponse({ code: 'NOT_FOUND', message: 'Plugin not found' }, 404);
    return jsonResponse({ success: true, data: { plugin } }, 200);
  } catch (error) {
    console.error('Error getting plugin detail:', error);
    return jsonResponse({ code: 'INTERNAL_ERROR', message: 'Failed to retrieve plugin' }, 500);
  }
};