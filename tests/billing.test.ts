import { BillingRepository } from '../src/billing/billing.repository';
import { BillingService } from '../src/billing/billing.service';

// Simple smoke test scaffolding that can be run in Node if a compatible DB mock is provided.

async function runBasic() {
  // Provide a minimal mock DB with prepare().bind().run()/first() chain used above.
  const rows: Record<string, any>[] = [];
  const mockDb = {
    prepare(sql: string) {
      return {
        bind: (..._args: any[]) => ({
          run: async () => ({ changes: 1 }),
          first: async () => null
        })
      };
    }
  };

  const repo = new BillingRepository(mockDb as any);
  const svc = new BillingService(mockDb as any);

  const w = await svc.checkBalance('user_test');
  console.log('wallet created', w.id, w.credits);

  try {
    await svc.consumeCredits('user_test', 10);
  } catch (e: any) {
    console.log('expected insufficient', e.message);
  }

  const rec = await svc.createUsage('user_test', {
    user_id: 'user_test',
    service: 'chat',
    model: 'gpt-mock',
    input_tokens: 10,
    output_tokens: 20,
    credits_used: 1,
    cost_usd: 0.01,
    status: 'completed',
    transaction_id: 'tx1'
  } as any);
  console.log('usage record', rec.id);

  // test consume with sufficient balance
  try {
    const before = await svc.checkBalance('user_test');
    // top up wallet for test
    await svc.refundCredits('user_test', 1000);
    const res = await svc.consumeCredits('user_test', 100, 'tx-consume-1');
    console.log('consume result', res);
  } catch (e: any) {
    console.error('consume error', e.message);
  }

  // test insufficient
  try {
    await svc.consumeCredits('user_test', 1000000, 'tx-consume-2');
  } catch (e: any) {
    console.log('expected insufficient', e.message);
  }

  // test duplicate transaction id
  try {
    await svc.consumeCredits('user_test', 10, 'tx-consume-1'); // same id - should be idempotent
    console.log('duplicate id handled');
  } catch (e: any) {
    console.error('duplicate handled error', e.message);
  }

  // refund test
  await svc.refundCredits('user_test', 50);
  const after = await svc.checkBalance('user_test');
  console.log('after refund', after.credits);
}

runBasic().catch((e) => { console.error(e); process.exit(1); });
