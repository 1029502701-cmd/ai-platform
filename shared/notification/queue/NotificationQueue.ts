import { EventBus } from "../events/EventBus";

export class NotificationQueue {
  private eventBus = EventBus.getInstance();

  async notify<T>(status: "queued" | "processing" | "completed" | "failed", data: T) {
    console.log("[Queue] Status: " + status + ", Data:", data);
  }
}
