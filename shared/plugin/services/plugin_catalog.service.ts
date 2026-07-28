/** PluginCatalogService - Manages the plugin marketplace catalog */

export enum CatalogStatus { DRAFT = 'draft', SUBMITTED = 'submitted', REVIEWING = 'reviewing', APPROVED = 'approved', REJECTED = 'rejected', PUBLISHED = 'published', DISABLED = 'disabled' }

export interface CatalogPlugin { 
  id: string; plugin_id: string; name: string; description: string; category: string; icon_url: string | null; author: string; version: string; status: CatalogStatus; visibility: 'public' | 'private'; featured: boolean; created_at: string; updated_at: string; 
}

export interface ListOptions { page?: number; limit?: number; category?: string; status?: CatalogStatus; featured?: boolean; }

export class PluginCatalogService { 
  private db: any; private tenantId: number;
  constructor(db: any, t = 1) { this.db = db; this.tenantId = t; }

  async listPlugins(o: ListOptions = {}) { const { page = 1, limit = 20, category, status, featured } = o; const offset = (page - 1) * limit; let wp = ['tenant_id = ?', 'visibility = ?']; let p = [this.tenantId, 'public']; if (status) { wp.push('status = ?'); p.push(status); } else { wp.push('status IN (?, ?)'); p.push(CatalogStatus.APPROVED, CatalogStatus.PUBLISHED); } if (category) { wp.push('category = ?'); p.push(category); } if (featured !== undefined) { wp.push('featured = ?'); p.push(featured ? 1 : 0); } const wc = wp.join(' AND '); const cr = await this.db.prepare('SELECT COUNT(*) as total FROM plugin_catalog WHERE ' + wc).all(...p); const total = cr[0]?.total || 0; const q = 'SELECT * FROM plugin_catalog WHERE ' + wc + ' ORDER BY CASE WHEN featured THEN 0 ELSE 1 END, created_at DESC LIMIT ? OFFSET ?'; const r = await this.db.prepare(q).concatParams(limit, offset).all(); const pl = r.map(row => ({ id: row.id, plugin_id: row.plugin_id, name: row.name, description: row.description, category: row.category, icon_url: row.icon_url, author: row.author, version: row.version, status: row.status as CatalogStatus, visibility: row.visibility, featured: Boolean(row.featured), created_at: row.created_at, updated_at: row.updated_at })); return { plugins: pl, total }; }

  async getPluginDetail(pid: string) { const r = await this.db.prepare('SELECT * FROM plugin_catalog WHERE plugin_id = ? AND tenant_id = ? AND visibility = ?').bind(this.tenantId, pid, 'public').first(); if (!r) return null; return { id: r.id, plugin_id: r.plugin_id, name: r.name, description: r.description, category: r.category, icon_url: r.icon_url, author: r.author, version: r.version, status: r.status as CatalogStatus, visibility: r.visibility, featured: Boolean(r.featured), created_at: r.created_at, updated_at: r.updated_at }; }

  async searchPlugins(query: string, opt: ListOptions = {}) { if (!query || query.trim() === '') return this.listPlugins(opt); const cq = '%' + query.trim().toLowerCase() + '%'; const { page = 1, limit = 20, category, status } = opt; const offset = (page - 1) * limit; let wp = ['tenant_id = ?', 'visibility = ?', '(LOWER(name) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(author) LIKE LOWER(?))']; let p = [this.tenantId, 'public', cq, cq, cq]; if (status) { wp.push('status = ?'); p.push(status); } else { wp.push('status IN (?, ?)'); p.push(CatalogStatus.APPROVED, CatalogStatus.PUBLISHED); } if (category) { wp.push('category = ?'); p.push(category); } const wc = wp.join(' AND '); const cr = await this.db.prepare('SELECT COUNT(*) as total FROM plugin_catalog WHERE ' + wc).all(...p); const total = cr[0]?.total || 0; const qs = 'SELECT * FROM plugin_catalog WHERE ' + wc + ' ORDER BY CASE WHEN featured THEN 0 ELSE 1 END, created_at DESC LIMIT ? OFFSET ?'; const res = await this.db.prepare(qs).concatParams(limit, offset).all(); const pl = res.map(row => ({ id: row.id, plugin_id: row.plugin_id, name: row.name, description: row.description, category: row.category, icon_url: row.icon_url, author: row.author, version: row.version, status: row.status as CatalogStatus, visibility: row.visibility, featured: Boolean(row.featured), created_at: row.created_at, updated_at: row.updated_at })); return { plugins: pl, total }; }

  async filterPluginsByCategory(c: string, o: ListOptions) { return this.listPlugins({ ...o, category: c }); }
  
  async getFeaturedPlugins(l: number = 6) { const r = await this.db.prepare('SELECT * FROM plugin_catalog WHERE tenant_id = ? AND featured = 1 AND status IN (?, ?) AND visibility = ? ORDER BY created_at DESC LIMIT ?').bind(this.tenantId, CatalogStatus.APPROVED, CatalogStatus.PUBLISHED, 'public', l).all(); return r.map(row => ({ id: row.id, plugin_id: row.plugin_id, name: row.name, description: row.description, category: row.category, icon_url: row.icon_url, author: row.author, version: row.version, status: row.status as CatalogStatus, visibility: row.visibility, featured: Boolean(row.featured), created_at: row.created_at, updated_at: row.updated_at })); }
  
  async getAllCategories(): Promise<string[]> { const r = await this.db.prepare('SELECT DISTINCT category FROM plugin_catalog WHERE tenant_id = ? AND visibility = ? ORDER BY category').bind(this.tenantId, 'public').all(); return r.map(row => row.category); }
}

export const catalogService = new PluginCatalogService(null as any, 1);