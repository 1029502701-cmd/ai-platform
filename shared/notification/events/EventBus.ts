import type { NotificationEvent, NotificationEventName } from ''../types'';

export class EventBus {
  private handlers: Map<NotificationEventName, Function[]> = new Map();

  on(event: NotificationEventName, handler: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  async emit(event: NotificationEventName, payload: any): Promise<void> {
    const handlers = this.handlers.get(event) || [];
    for (const handler of handlers) {
      try {
        handler({ event, timestamp: new Date().toISOString(), payload });
      } catch (e) {
        console.error('Error emitting event ' + event + ':', e);
      }
    }
  }

  static instance = new EventBus();
  static getInstance() { return EventBus.instance }}

