/** PluginPublishService - Handles plugin submission and approval workflow */

export class PluginPublishService {
  private db: any;
  constructor(db: any) { this.db = db; }

  async submitPlugin(manifest, submitterId, version) {
    const now = new Date().toISOString(); const sv = version || manifest.version;
    if (!manifest.id || !manifest.name || !manifest.version || !manifest.author) throw new Error('Invalid plugin manifest');
    const existing = await this.db.prepare('SELECT * FROM plugin_publish_requests WHERE plugin_id = ? AND version = ? AND status != ?').bind(manifest.id, sv, 'rejected').first();
    if (existing) throw new Error('Version ' + sv + ' for plugin ' + manifest.id + ' is already under review');
    const result = await this.db.prepare('INSERT INTO plugin_publish_requests (plugin_id, version, submitter_id, status, created_at, updated_at) VALUES (?, ?, ?, \'submitted\', ?, ?)').bind(manifest.id, sv, submitterId, now, now).run();
    return { id: result.lastInsertRowid, pluginId: manifest.id, version: sv, status: 'submitted', submitterId, createdAt: now };
  }

  async approvePlugin(requestId, reviewerId, reviewNote = '') {
    const now = new Date().toISOString();
    const req = await this.db.prepare('SELECT * FROM plugin_publish_requests WHERE id = ? AND status = ?').bind(requestId, 'submitted').first();
    if (!req) throw new Error('Request not found or not in submitted state');
    await this.db.prepare('UPDATE plugin_publish_requests SET status = ?, review_note = ?, updated_at = ? WHERE id = ?').bind('approved', reviewNote, now, requestId).run();
    await this.db.prepare('INSERT INTO plugin_catalog (plugin_id, name, description, category, author, status, visibility, version, created_at, updated_at) SELECT ?, ?, ?, ?, ?, \'approved\', \'public\', ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM plugin_catalog WHERE plugin_id = ? AND status = \'approved\') ON CONFLICT(plugin_id) DO UPDATE SET status = \'approved\', updated_at = excluded.updated_at, version = excluded.version RETURNING *').bind(req.plugin_id, req.plugin_id, '', req.plugin_id, req.submitterId, req.version, now, now, req.plugin_id, now);
    return this.getPluginDetailFromCatalog(req.plugin_id);
  }

  async rejectPlugin(requestId, reviewerId, reviewNote = '') {
    const now = new Date().toISOString();
    const req = await this.db.prepare('SELECT * FROM plugin_publish_requests WHERE id = ? AND status = ?').bind(requestId, 'submitted').first();
    if (!req) throw new Error('Request not found or not in submitted state');
    await this.db.prepare('UPDATE plugin_publish_requests SET status = ?, review_note = ?, updated_at = ? WHERE id = ?').bind('rejected', reviewNote, now, requestId).run();
    await this.db.prepare('DELETE FROM plugin_catalog WHERE plugin_id = ? AND status = ?').bind(req.plugin_id, 'submitted').run();
  }

  async publishPlugin(pluginId, publisherId) {
    const now = new Date().toISOString();
    await this.db.prepare('UPDATE plugin_publish_requests SET status = ?, updated_at = ? WHERE plugin_id = ? AND status = ?').bind('published', now, pluginId, 'approved').run();
    await this.db.prepare('UPDATE plugin_catalog SET status = ?, updated_at = ? WHERE plugin_id = ? AND status = ?').bind('published', now, pluginId, 'approved').run();
    return this.getPluginDetailFromCatalog(pluginId);
  }

  async getPluginDetailFromCatalog(pid) {
    const r = await this.db.prepare('SELECT * FROM plugin_catalog WHERE plugin_id = ? AND status IN (?, ?) AND visibility = ?').bind(pid, 'approved', 'published', 'public').first();
    if (!r) throw new Error('Plugin ' + pid + ' not found in catalog');
    return { id: r.id, plugin_id: r.plugin_id, name: r.name, description: r.description, category: r.category, icon_url: r.icon_url, author: r.author, version: r.version, status: r.status, visibility: r.visibility, featured: Boolean(r.featured), created_at: r.created_at, updated_at: r.updated_at };
  }
}

export const publishService = new PluginPublishService(null as any);