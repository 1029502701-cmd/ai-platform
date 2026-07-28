import type { Notification } from '../types';
import type { NotificationRepository } from '../repositories/NotificationRepository';

export class NotificationScheduler {
  private repo: NotificationRepository;

  constructor(repo: NotificationRepository) {
    this.repo = repo;
  }

  async schedule(notification, scheduleOptions) {
    if (scheduleOptions && scheduleOptions.delayMs) {
      const sendAt = new Date(Date.now() + scheduleOptions.delayMs).toISOString();
      await this.repo.setNextSendAt(notification.id, sendAt);
      return sendAt;
    }
    if (scheduleOptions && scheduleOptions.at) {
      await this.repo.setNextSendAt(notification.id, scheduleOptions.at);
      return scheduleOptions.at;
    }
    await this.repo.setNextSendAt(notification.id, new Date().toISOString());
    return new Date().toISOString();
  }

  async cancelNotification(id) {
    await this.repo.updateStatus(id, 'cancelled');
  }

  async retryNotification(id) {
    await this.repo.increaseDeliveryCount(id);
    await this.repo.updateStatus(id, 'retrying');
    await this.repo.setNextSendAt(id, new Date().toISOString());
  }

  async processScheduled(tenantId, now) {
    return await this.repo.listForScheduled(tenantId, now);
  }
}
