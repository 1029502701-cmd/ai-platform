import { NotificationModel } from ''../models/NotificationModel'';
import { NotificationTemplateModel } from ''../models/NotificationTemplateModel'';
import { NotificationPreferenceModel } from ''../models/NotificationPreferenceModel'';
import { NotificationLogModel } from ''../models/NotificationLogModel'';
import { MockProvider } from ''../providers/MockProvider'';
import { EventBus } from ''../events/EventBus'';
import type { Notification, NotificationProvider, ScheduleOptions, SendNotificationRequest, BroadcastNotificationRequest } from ''../types'';
import { DrystoneNotificationRepository } from ''../repositories/NotificationRepository'';
import { DrystoneTemplateRepository } from ''../repositories/NotificationTemplateRepository'';
import { DrystonePreferenceRepository } from ''../repositories/NotificationPreferenceRepository'';
import { DrystoneLogRepository } from ''../repositories/NotificationLogRepository'';
import { NotificationScheduler } from ''../scheduler/NotificationScheduler'';
import { SystemChannel } from ''../channels/SystemChannel'';
import { EmailChannel } from ''../channels/EmailChannel'';
import { WechatChannel } from ''../channels/WechatChannel'';
import { SMSChannel } from ''../channels/SMSChannel'';
import { WebhookChannel } from ''../channels/WebhookChannel'';
import { PushChannel } from ''../channels/PushChannel'';

export class NotificationService {
  private repo; private templateRepo; private preferenceRepo; private logRepo; private scheduler; private providers; private eventBus;

  constructor(env, tenantId) {
    this.repo = new DrystoneNotificationRepository(env.DB, tenantId);
    this.templateRepo = new DrystoneTemplateRepository(env.DB, tenantId);
    this.preferenceRepo = new DrystonePreferenceRepository(env.DB, tenantId);
    this.logRepo = new DrystoneLogRepository(env.DB, tenantId);
    this.scheduler = new NotificationScheduler(this.repo);
    this.providers = { mock: new MockProvider() };
    this.eventBus = EventBus.getInstance();
  }

  async send(request) {
    const notification = { id: 0, tenantId: request.tenantId || 1, userId: request.userId, templateId: request.templateId, triggerId: request.triggerId, notificationType: request.notificationType, channel: 'system', payload: request.payload, status: 'pending', priority: request.priority || 1, deliveryCount: 0, nextSendAt: null, scheduledBy: null, sentAt: null, failedAt: null, errorMessage: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const id = await this.repo.create(notification as any);
    notification.id = id;
    await this.eventBus.emit('notification.created', { notification });
    await this.deliver(notification, request.payload);
    return { success: true, notificationId: id };
  }

  async broadcast(request) {
    const userIds = request.userIds || [];
    for (const userId of userIds) {
      const notif = { tenantId: request.tenantId || 1, userId, templateId: request.templateId, triggerId: null, notificationType: request.notificationType, channel: 'system', payload: request.payload, status: 'pending', priority: request.priority || 1, deliveryCount: 0, nextSendAt: null, scheduledBy: null, sentAt: null, failedAt: null, errorMessage: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      const id = await this.repo.create(notif as any);
      notif.id = id;
      await this.eventBus.emit('notification.created', { notification: notif });
      await this.deliver(notif, request.payload);
    }
    return { success: true, notificationIds: userIds.length ? userIds.map(() => Date.now()) : [] };
  }

  async schedule(req, scheduleOptions) {
    const notification = { tenantId: req.tenantId || 1, userId: req.userId, templateId: req.templateId, triggerId: req.triggerId, notificationType: req.notificationType, channel: 'system', payload: req.payload, status: 'pending', priority: req.priority || 1, deliveryCount: 0, nextSendAt: null, scheduledBy: req.userId, sentAt: null, failedAt: null, errorMessage: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const id = await this.repo.create(notification as any);
    notification.id = id;
    if (scheduleOptions && scheduleOptions.delayMs) await this.repo.setNextSendAt(id, new Date(Date.now() + scheduleOptions.delayMs).toISOString());
    await this.eventBus.emit('notification.created', { notification });
    return { success: true, notificationId: id };
  }

  async cancel(id) { await this.repo.updateStatus(id, 'cancelled'); await this.eventBus.emit('notification.deleted', { id }); return { success: true }; }
  async retry(id) { await this.scheduler.retryNotification(id); await this.eventBus.emit('notification.retry', { id }); return { success: true }; }

  async preview(templateId, variables) {
    const template = await this.templateRepo.findById(templateId);
    if (!template) throw new Error('Template not found');
    let content = template.content;
    content = content.replace(/{{user}}/, String(variables.user || ''));
    content = content.replace(/{{plugin}}/, String(variables.plugin || ''));
    content = content.replace(/{{workflow}}/, String(variables.workflow || ''));
    content = content.replace(/{{time}}/, String(variables.time || new Date().toISOString()));
    content = content.replace(/{{order}}/, String(variables.order || ''));
    return content;
  }

  async getHistory(userId, opts) {
    const notifications = await this.repo.listByUserId(userId, opts?.limit || 50, opts?.offset || 0);
    return Promise.all(notifications.map(async (notif) => ({ ...notif, logs: await this.logRepo.listByNotificationId(notif.id) })));
  }

  async markRead(id) { await this.eventBus.emit('notification.read', { id }); return { success: true }; }

  private async deliver(notification, payload) {
    const provider = this.providers[notification.channel] || this.providers['mock'];
    try {
      const result = await provider.send(notification, payload);
      await this.repo.markAsSent(notification.id, new Date().toISOString(), payload);
      const log = new NotificationLogModel({ notificationId: notification.id, tenantId: notification.tenantId, channel: notification.channel, attemptNumber: 1, status: 'success', payloadSent: JSON.stringify(payload), responseReceived: JSON.stringify(result), errorDetails: null, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() });
      await this.logRepo.create(log);
      await this.eventBus.emit('notification.sent', { notification, result });
    } catch (error) {
      await this.repo.markAsFailed(notification.id, new Date().toISOString(), error.message || 'Unknown error');
      const log = new NotificationLogModel({ notificationId: notification.id, tenantId: notification.tenantId, channel: notification.channel, attemptNumber: 1, status: 'failed', payloadSent: JSON.stringify(payload), responseReceived: null, errorDetails: error.message, startedAt: new Date().toISOString(), completedAt: new Date().toISOString() });
      await this.logRepo.create(log);
      await this.eventBus.emit('notification.failed', { notification, error: error.message });
    }
  }
}
