import assert from 'assert';
import { BeautyRepository } from '../database/beauty_repository';

// NOTE: This TypeScript test is companion to the JS runner test. It is not executed by npm test directly.
async function runTs() {
  // Simple smoke to ensure repository class can be constructed
  const mockDb: any = {
    prepare: (_sql: string) => ({ bind: () => ({ first: async () => null, all: async () => [], run: async () => ({}) }) }),
  };
  const repo = new BeautyRepository(mockDb);
  const res = await repo.getProfile('nonexistent');
  assert(res === null);
  console.log('TypeScript beauty profile test (smoke) passed');
}

runTs().catch((e) => { console.error(e); process.exit(2); });
