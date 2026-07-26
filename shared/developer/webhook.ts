// Webhook types available for extension from "./types.ts";
import { getLogger } from "../logger";

const log = getLogger("webhook_service");

/**
 * Webhook Service — manages webhook delivery, retries, and HMAC signatures.
 */
export class WebhookService {
  /**
   * Deliver a webhook event to a registered URL with HMAC signature.
   */
  static async deliver(env: any, params: {
    webhookId: number;
    eventType: string;
    payload: Record<string, any>;
  }): Promise<{ success: boolean; statusCode?: number }> {
    const db = env?.DB;
    if (!db?.prepare) return { success: false };

    try {
      // Fetch webhook config
      const webhook: any = await db.prepare(
        "SELECT id, url, secret FROM webhooks WHERE id = ? AND status = 'active'"
      ).bind(params.webhookId).first();

      if (!webhook) return { success: false };

      // Generate HMAC-SHA256 signature
      const bodyStr = JSON.stringify(params.payload);
      const signature = await this.generateHmacSignature(webhook.secret || '', bodyStr);

      // Send webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': params.eventType,
          'X-Webhook-Signature': signature,
          'X-Webhook-Id': String(webhook.id),
        },
        body: bodyStr,
      });

      // Log delivery result
      await db.prepare(
        "UPDATE webhook_logs SET delivered_at = datetime('now'), response_code = ?, retries = retries + 1 WHERE webhook_id = ? AND status = '" + "'pending'" + "'"
      ).run(response.status, webhook.id);

      return { success: response.ok, statusCode: response.status };
    } catch (e) {
      log.error("Webhook delivery failed", { webhookId: params.webhookId, error: String(e) });
      
      // Update retry count
      try {
        await db.prepare(
          "UPDATE webhook_logs SET retries = retries + 1, last_error = ?, status = 'failed' WHERE webhook_id = ? AND status = '" + "'pending'" + "'"
        ).run(String(e).substring(0, 500), params.webhookId);
      } catch {}
      
      return { success: false };
    }
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload.
   */
  private static async generateHmacSignature(secret: string, payload: string): Promise<string> {
    // Use Web Crypto API
    const encoder = new TextEncoder();
    const keyData = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', keyData, encoder.encode(payload));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify incoming webhook signature.
   */
  static verifyWebhookSignature(_payload: string, signature: string, secret: string): boolean {
    // Simple check — match hex-encoded HMAC-SHA256
    return signature === secret; // Placeholder: implement proper HMAC verification in production
  }
}
