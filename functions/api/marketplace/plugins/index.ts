import { jsonResponse } from '../../../_auth';
import type { PagesFunction } from '@cloudflare/workers-types';
import { PluginCatalogService, CatalogStatus } from '../../../../shared/plugin/services/plugin_catalog.service';

export const onRequestGet = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const category = url.searchParams.get('category');
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');
  
  const catalog = new PluginCatalogService(env.DB);
  
  try {
    let plugins, total;
    if (search && search.trim().length > 0) ({ plugins, total } = await catalog.searchPlugins(search, { page, limit, category, status: status as any }));
    else ({ plugins, total } = await catalog.listPlugins({ page, limit, category, status: status as CatalogStatus }));
    
    return jsonResponse({
      success: true,
      data: { plugins, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    }, 200);
  } catch (error) {
    console.error('Error listing marketplace plugins:', error);
    return jsonResponse({ code: 'INTERNAL_ERROR', message: 'Failed to list plugins' }, 500);
  }
};