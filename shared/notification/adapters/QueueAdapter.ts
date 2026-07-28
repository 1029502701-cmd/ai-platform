// Adapter to use existing queue system

export class QueueAdapter {
  static async push(queueName, job) {
    console.log("[QueueAdapter] Pushing to " + queueName + ":", job);
    return "job-" + Date.now();
  }
}
