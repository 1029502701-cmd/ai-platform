// Basic test runner for AI Core using simple mocks
const assert = require('assert');
(async () => {
  console.log('Running AI Core basic tests (mocked)');
  try {
    // Load AI Core module
    const core = require('../../shared/services/ai_core');
    // Monkeypatch ai_service pipeline functions used by ai_core
    const ai_service = require('../../shared/services/ai_service');
    // Backup originals
    const origText = ai_service.generateTextWithPipeline;
    const origChat = ai_service.generateChatWithPipeline;

    ai_service.generateTextWithPipeline = async (env, req) => {
      if (req.forceError) throw new Error('provider_error');
      if (req.timeout) {
        await new Promise((r)=>setTimeout(r, req.timeout + 50));
      }
      return { content: 'mock-text-1', model: req.model || 'mock-model', provider: 'mock' };
    };
    ai_service.generateChatWithPipeline = async (env, req) => {
      return { content: 'mock-chat-1', model: req.model || 'mock-model', provider: 'mock' };
    };

    // Mock env with minimal DB prepare for scenarios
    const env = {
      DB: {
        prepare: (sql) => ({ get: async (key) => {
          if (key === 'chat_default') return { default_model_id: 'mock-model', default_prompt_key: 'chat_default_prompt', default_kb_key: null };
          return null;
        }})
      }
    };

    // Test 1: normal generate text via scenario
    const res1 = await core.generateViaCore(env, { scenario: 'chat_default', aiRequest: { promptKey: 'chat_default_prompt' } });
    assert(res1.ok && res1.data && res1.data.content === 'mock-text-1');
    console.log('Test 1 passed: normal generate');

    // Test 2: prompt load failure simulated by missing promptKey (ai_service still returns)
    const res2 = await core.generateViaCore(env, { scenario: 'chat_default', aiRequest: { } });
    assert(res2.ok);
    console.log('Test 2 passed: prompt missing handled');

    // Test 3: knowledge missing
    const res3 = await core.generateViaCore(env, { aiRequest: { model: 'mock-model', promptKey: 'qa_prompt', knowledgeBaseId: 'nonexistent' } });
    assert(res3.ok);
    console.log('Test 3 passed: missing knowledge handled');

    // Test 4: provider error
    const res4 = await core.generateViaCore(env, { aiRequest: { forceError: true } });
    assert(!res4.ok);
    console.log('Test 4 passed: provider error surfaced');

    // Test 5: timeout behavior - ai_service mock will delay
    const timeoutReq = { timeout: 10 };
    const res5 = await core.generateViaCore(env, { aiRequest: timeoutReq });
    assert(res5.ok);
    console.log('Test 5 passed: timeout simulated');

    // Test 6: permission failure - since AI Core does not enforce permissions, simulate expected behavior
    console.log('Test 6 skipped: permission enforcement is handled upstream by PermissionService');

    // restore
    ai_service.generateTextWithPipeline = origText;
    ai_service.generateChatWithPipeline = origChat;

    console.log('All mocked tests completed.');
    process.exit(0);
  } catch (e) {
    console.error('Test failed', e);
    process.exit(2);
  }
})();
