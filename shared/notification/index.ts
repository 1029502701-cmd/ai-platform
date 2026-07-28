/**
 * Notification Center Foundation - Main Entry Point
 */

// Types
export type { 
  NotificationChannel, 
  NotificationStatus, 
  LogStatus, 
  TemplateStatus, 
  TemplateType, 
  Priority, 
  NotificationEventName,
  ScheduleType,
  NotificationEvent
} from './types';

// Interfaces
export type { 
  NotificationTemplate, 
  NotificationTemplateVersion, 
  Notification, 
  NotificationLog, 
  NotificationPreference, 
  NotificationChannelConfig,
  NotificationProvider,
  ScheduleOptions,
  TemplateVariables,
  SendNotificationRequest,
  BroadcastNotificationRequest,
  NotificationDTO,
  PaginationOptions,
  NotificationHistoryItem
} from './types';

// Models
export { NotificationModel } from './models/NotificationModel';
export { NotificationTemplateModel } from './models/NotificationTemplateModel';
export { NotificationPreferenceModel } from './models/NotificationPreferenceModel';
export { NotificationLogModel } from './models/NotificationLogModel';
export { NotificationChannelModel } from './models/NotificationChannelModel';

// Repositories
export { NotificationRepository } from './repositories/NotificationRepository';
export { DrystoneNotificationRepository } from './repositories/NotificationRepository';
export { NotificationTemplateRepository } from './repositories/NotificationTemplateRepository';
export { DrystoneTemplateRepository } from './repositories/NotificationTemplateRepository';
export { NotificationPreferenceRepository } from './repositories/NotificationPreferenceRepository';
export { DrystonePreferenceRepository } from './repositories/NotificationPreferenceRepository';
export { NotificationLogRepository } from './repositories/NotificationLogRepository';
export { DrystoneLogRepository } from './repositories/NotificationLogRepository';

// Providers
export { MockProvider } from './providers/MockProvider';
export { EmailProvider } from './providers/EmailProvider';
export { SMSProvider } from './providers/SMSProvider';
export { WebhookProvider } from './providers/WebhookProvider';
// WechatProvider and PushProvider can be added similarly

// Channels
export { SystemChannel } from './channels/SystemChannel';
export { EmailChannel } from './channels/EmailChannel';
export { WechatChannel } from './channels/WechatChannel';
export { SMSChannel } from './channels/SMSChannel';
export { WebhookChannel } from './channels/WebhookChannel';
export { PushChannel } from './channels/PushChannel';

// Templates
export { NotificationTemplateService } from './templates/NotificationTemplateService';

// Services
export { NotificationService } from './services/NotificationService';

// Events
export { EventBus } from './events/EventBus';

// Queue
export { NotificationQueue } from './queue/NotificationQueue';

// Scheduler
export { NotificationScheduler } from './scheduler/NotificationScheduler';

// Adapters
export { QueueAdapter } from './adapters/QueueAdapter';

// Utils (to be added)
// Adapters (to be added)
