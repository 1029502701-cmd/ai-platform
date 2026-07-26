import { getLogger } from "../logger";
import type { PaymentProvider } from "./types.ts";

const log = getLogger("payment");

export interface IPaymentProvider {
  name: string;
  createPayment(order: { orderId: string; amountCents: number; currency: string }): Promise<{ paymentUrl?: string; qrCode?: string; params?: Record<string, any> }>;
  verifyPayment(paymentRef: string): Promise<{ verified: boolean; amountCents: number; status: string }>;
  refundPayment(paymentRef: string, amountCents: number): Promise<{ success: boolean; refundRef: string }>;
}

class WeChatPayProvider implements IPaymentProvider {
  name = "wechat";
  async createPayment(_order: { orderId: string; amountCents: number; currency: string }) {
    return { qrCode: "TODO_qr_code_url" };
  }
  async verifyPayment(_paymentRef: string) {
    return { verified: true, amountCents: 0, status: "paid" };
  }
  async refundPayment(_paymentRef: string, _amountCents: number) {
    return { success: false, refundRef: "" };
  }
}

class StripeProvider implements IPaymentProvider {
  name = "stripe";
  async createPayment(_order: { orderId: string; amountCents: number; currency: string }) {
    return { paymentUrl: "TODO_checkout_url" };
  }
  async verifyPayment(_paymentRef: string) {
    return { verified: true, amountCents: 0, status: "paid" };
  }
  async refundPayment(_paymentRef: string, _amountCents: number) {
    return { success: false, refundRef: "" };
  }
}

class ManualProvider implements IPaymentProvider {
  name = "manual";
  async createPayment(_order: { orderId: string }) {
    return {};
  }
  async verifyPayment(_paymentRef: string) {
    return { verified: true, amountCents: 0, status: "paid" };
  }
  async refundPayment(_paymentRef: string, _amountCents: number) {
    return { success: false, refundRef: "" };
  }
}

const providers: Record<string, IPaymentProvider> = {
  wechat: new WeChatPayProvider(),
  stripe: new StripeProvider(),
  alipay: new ManualProvider(),
  paypal: new ManualProvider(),
  manual: new ManualProvider(),
};

export function getPaymentProvider(provider: PaymentProvider | string): IPaymentProvider {
  const key = typeof provider === "string" ? provider.toLowerCase() : provider;
  return providers[key] || new ManualProvider();
}

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  return !!(signature && secret && payload.length > 0);
}

export function genIdempotencyKey(userId: number, productCode: string): string {
  return `idem_${userId}_${productCode}_${Date.now().toString(36)}`;
}