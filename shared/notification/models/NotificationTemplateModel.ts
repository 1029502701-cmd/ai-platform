import type { NotificationChannel, TemplateStatus, TemplateType } from '../types';

export class NotificationTemplateModel {
  id: number;
  tenantId: number;
  name: string;
  channel: NotificationChannel;
  templateType: TemplateType;
  version: number;
  subject: string \| null;
  content: string;
  variables: string[];
  metadata: Record<string, any>;
  status: TemplateStatus;
  createdBy: number \| null;
  updatedBy: number \| null;
  createdAt: string;
  updatedAt: string;

  constructor(data: Omit<NotificationTemplate, 'id' \| 'createdAt' \| 'updatedAt'>) {
    this.name = data.name;
    this.channel = data.channel;
    this.templateType = data.templateType;
    this.version = data.version;
    this.subject = data.subject;
    this.content = data.content;
    this.variables = data.variables;
    this.metadata = data.metadata;
    this.status = data.status;
    this.createdBy = data.createdBy;
    this.updatedBy = data.updatedBy;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
  }

  static fromRow(row: any): NotificationTemplateModel {
    const model = new NotificationTemplateModel({
      name: row.name,
      channel: row.channel,
      templateType: row.template_type,
      version: row.version || 1,
      subject: row.subject || null,
      content: row.content,
      variables: Array.isArray(row.variables) ? row.variables : (typeof row.variables === 'string' ? JSON.parse(row.variables) : []),
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {},
      status: row.status,
      createdBy: row.created_by || null,
      updatedBy: row.updated_by || null,
    });
    model.id = row.id;
    model.tenantId = row.tenant_id;
    model.updatedAt = row.updated_at || model.updatedAt;
    return model;
  }
}
