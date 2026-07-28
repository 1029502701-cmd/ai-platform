import { jsonResponse } from '../../../_auth';
import type { PagesFunction } from '@cloudflare/workers-types';
import { PluginCatalogService } from '../../../../shared/plugin/services/plugin_catalog.service';

export const onRequestGet = async (context) => {
  const { env } = context;
  const catalog = new PluginCatalogService(env.DB);
  
  try {
    const categories = await catalog.getAllCategories();
    return jsonResponse({ success: true, data: { categories } }, 200);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return jsonResponse({ code: 'INTERNAL_ERROR', message: 'Failed to get categories' }, 500);
  }
};