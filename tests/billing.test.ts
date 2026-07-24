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
    status: 'completed'
  } as any);
  console.log('usage record', rec.id);
}

runBasic().catch((e) => { console.error(e); process.exit(1); });
