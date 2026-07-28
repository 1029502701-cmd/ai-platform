import type { NotificationTemplate } from '../types';
import { NotificationTemplateModel } from '../models/NotificationTemplateModel';

export interface NotificationTemplateRepository {
  create(template: Omit<NotificationTemplate, 'id' \| 'createdAt' \| 'updatedAt'>): Promise<number>;
  findById(id: number): Promise<NotificationTemplate \| null>;
  findByNameAndChannel(tenantId: number, name: string, channel: NotificationChannel, version?: number): Promise<NotificationTemplate \| null>;
  listByTenant(tenantId: number, status?: TemplateStatus): Promise<NotificationTemplate[]>;
  listActiveByChannel(tenantId: number, channel: NotificationChannel): Promise<NotificationTemplate[]>;
  update(id: number, updates: Partial<Omit<NotificationTemplate, 'id'>>): Promise<void>;
  incrementVersion(tenantId: number, name: string, channel: NotificationChannel): Promise<void>;
  delete(id: number): Promise<void>;
}

export class DrystoneTemplateRepository implements NotificationTemplateRepository {
  private db: any;
  private tenantId: number;

  constructor(db: any, tenantId: number) {
    this.db = db;
    this.tenantId = tenantId;
  }

  async create(template: Omit<NotificationTemplate, 'id' \| 'createdAt' \| 'updatedAt'>): Promise<number> {
    const result = await this.db.prepare(
      'INSERT INTO notification_templates (tenant_id, name, channel, template_type, version, subject, content, variables, metadata, status, created_by, updated_by) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      template.tenantId,
      template.name,
      template.channel,
      template.templateType,
      template.version,
      template.subject,
      template.content,
      JSON.stringify(template.variables),
      JSON.stringify(template.metadata),
      template.status,
      template.createdBy,
      template.updatedBy
    );
    return result.lastInsertRowid as number;
  }

  async findById(id: number): Promise<NotificationTemplate \| null> {
    const row = await this.db.prepare(
      'SELECT * FROM notification_templates WHERE tenant_id = ? AND id = ?'
    ).bind(this.tenantId, id).first();
    return row ? NotificationTemplateModel.fromRow(row) : null;
  }

  async findByNameAndChannel(tenantId: number, name: string, channel: NotificationChannel, version?: number): Promise<NotificationTemplate \| null> {
    const sql = 'SELECT * FROM notification_templates WHERE tenant_id = ? AND name = ? AND channel = ?' + (version ? ' AND version = ?' : '') + ' ORDER BY version DESC LIMIT 1';
    const params = [tenantId, name, channel];
    if (version !== undefined) params.push(version);
    const row = await this.db.prepare(sql).all(...params)[0];
    return row ? NotificationTemplateModel.fromRow(row) : null;
  }

  async listByTenant(tenantId: number, status?: TemplateStatus): Promise<NotificationTemplate[]> {
    let sql = 'SELECT * FROM notification_templates WHERE tenant_id = ?';
    const params: any[] = [tenantId];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY name';
    const rows = await this.db.prepare(sql).all(...params);
    return rows.map(row => {
      const model = NotificationTemplateModel.fromRow(row);
      model.tenantId = tenantId;
      return model;
    });
  }

  async listActiveByChannel(tenantId: number, channel: NotificationChannel): Promise<NotificationTemplate[]> {
    const sql = 'SELECT * FROM notification_templates WHERE tenant_id = ? AND channel = ? AND status = ? ORDER BY version DESC';
    const rows = await this.db.prepare(sql).all(tenantId, channel, 'active');
    return rows.map(row => {
      const model = NotificationTemplateModel.fromRow(row);
      model.tenantId = tenantId;
      return model;
    });
  }

  async update(id: number, updates: Partial<Omit<NotificationTemplate, 'id'>>) {
    const setParts: string[] = [];
    const params: any[] = [];
    
    if (updates.name !== undefined) { setParts.push('name = ?'); params.push(updates.name); }
    if (updates.channel !== undefined) { setParts.push('channel = ?'); params.push(updates.channel); }
    if (updates.templateType !== undefined) { setParts.push('template_type = ?'); params.push(updates.templateType); }
    if (updates.version !== undefined) { setParts.push('version = ?'); params.push(updates.version); }
    if (updates.subject !== undefined) { setParts.push('subject = ?'); params.push(updates.subject); }
    if (updates.content !== undefined) { setParts.push('content = ?'); params.push(updates.content); }
    if (updates.variables !== undefined) { setParts.push('variables = ?'); params.push(JSON.stringify(updates.variables)); }
    if (updates.metadata !== undefined) { setParts.push('metadata = ?'); params.push(JSON.stringify(updates.metadata)); }
    if (updates.status !== undefined) { setParts.push('status = ?'); params.push(updates.status); }
    if (updates.updatedBy !== undefined) { setParts.push('updated_by = ?'); params.push(updates.updatedBy); }

    if (setParts.length === 0) return;

    const sql = \UPDATE notification_templates SET \ WHERE id = ? AND tenant_id = ?\;
    await this.db.prepare(sql).run(...params, id, this.tenantId);
  }

  async incrementVersion(tenantId: number, name: string, channel: NotificationChannel): Promise<void> {
    await this.db.prepare(
      'UPDATE notification_templates SET version = version + 1, updated_at = CURRENT_TIMESTAMP ' +
      'WHERE tenant_id = ? AND name = ? AND channel = ? AND status = ?'
    ).run(tenantId, name, channel, 'active');
  }

  async delete(id: number): Promise<void> {
    await this.db.prepare('DELETE FROM notification_templates WHERE id = ? AND tenant_id = ?').run(id, this.tenantId);
  }
}
