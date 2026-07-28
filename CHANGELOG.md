# CHANGELOG

## [1.8.0] - 2026-07-28

### Added

- **Notification Center Foundation (Task-Platform-008)**: Unified notification service for all platform modules

### New Features

- NotificationService with send(), schedule(), cancel(), retry(), broadcast(), preview(), getHistory(), markRead() methods
- Template system with variable substitution: {{user}}, {{plugin}}, {{workflow}}, {{time}}, {{order}}
- 6 channel support: System, Email, Wechat, SMS, Webhook, Push
- 4 provider implementations (Mock + stubs for Email, SMS, Webhook)
- EventBus with 6 event types: created, sent, failed, retry, read, deleted
- Scheduler with immediate, delayed, scheduled delivery
- Tenant-isolated repositories for all notification data
- Migration: drizzle/0042_notification_center.sql with 5 new tables

### API Endpoints

- GET /api/notifications
- GET /api/notifications/:id
- POST /api/notifications/send
- POST /api/notifications/broadcast
- PUT /api/notifications/read
- DELETE /api/notifications/:id

### Integration

- Identity integration (user preferences, language, timezone ready)
- Permission integration (tenant isolation)
- Billing integration (payment, refund, expiration notifications)
- Storage integration (attachment support via payload)
- Workflow integration (event listening, retry on failure)
- Plugin SDK integration (NotificationService available for plugins)
- Queue integration (existing QueueAdapter usage)

### Architecture

- Clean separation: Services, Repositories, Providers, Channels, Templates, Events, Scheduler, Queue, Models
- No dependencies on business modules (backward compatible)
- All new files only, no existing code modified
