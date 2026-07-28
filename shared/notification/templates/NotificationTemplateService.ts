import type { NotificationTemplate, NotificationTemplateVersion, ScheduleOptions, TemplateVariables } from '../types';
import { NotificationTemplateModel } from '../models/NotificationTemplateModel';

export class NotificationTemplateService {
  private templateRepo;

  constructor(templateRepo: any) {
    this.templateRepo = templateRepo;
  }

  async createTemplate(tenantId: number, name: string, channel: string, templateType: string, content: string, variables: string[], metadata: Record<string, any> = {}): Promise<NotificationTemplate> {
    const id = await this.templateRepo.create({
      tenantId,
      name,
      channel,
      templateType,
      version: 1,
      subject: null,
      content,
      variables,
      metadata,
      status: 'active',
      createdBy: 0,
      updatedBy: 0,
    });
    return this.getTemplate(tenantId, id, 1);
  }

  async getTemplate(tenantId: number, id: number, version?: number): Promise<NotificationTemplate \| null> {
    if (version) {
      return await this.templateRepo.findByNameAndChannel(tenantId, '', 'system', version);
    }
    const template = await this.templateRepo.findById(id);
    if (template) template.tenantId = tenantId;
    return template as NotificationTemplate \| null;
  }

  async renderTemplate(template: NotificationTemplate, variables: TemplateVariables): Promise<string> {
    let content = template.content;
    content = content.replace(/\{\{user\}\g1\g, () => String(variables.user || ''));
    content = content.replace(/\{\{plugin\}\g1\g, () => String(variables.plugin || ''));
    content = content.replace(/\{\{workflow\}\g1\g, () => String(variables.workflow || ''));
    content = content.replace(/\{\{time\}\g1\g, () => String(variables.time || new Date().toISOString()));
    content = content.replace(/\{\{order\}\g1\g, () => String(variables.order || ''));
    return content;
  }

  async previewTemplate(templateId: number, variables: TemplateVariables): Promise<string> {
    const template = await this.getTemplate(1, templateId); // TODO: proper tenant
    if (!template) throw new Error('Template not found');
    return this.renderTemplate(template, variables);
  }

  async addVersion(tenantId: number, templateId: number, version: number, content: string, subject: string \| null, createdBy: number): Promise<NotificationTemplateVersion> {
    // Implementation for template versioning
    return { id: Date.now(), templateId, version, subject, content, variables: [], metadata: {}, creatorId: createdBy, createdAt: new Date().toISOString() };
  }

  async listVersions(tenantId: number, templateId: number): Promise<NotificationTemplateVersion[]> {
    return [];
  }
}
