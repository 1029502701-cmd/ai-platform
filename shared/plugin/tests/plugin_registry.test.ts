import { assert } from 'assert';
import { PluginRegistryService, PluginStatus, PluginManifest, legacyToManifest } from '../index';

// Create a mock database
const mockDb = {
  prepare: () => ({
    bind: () => ({
      first: async () => null,
      run: async () => ({})
    })
  })
};

describe('PluginRegistry', function() {
  let registry;

  beforeEach(function() {
    registry = new PluginRegistryService({ db: mockDb });
  });

  it('should register a plugin', async function() {
    const manifest: PluginManifest = {
      id: 'test-plugin-1',
      name: 'Test Plugin 1',
      version: '1.0.0',
      description: 'A test plugin',
      author: { name: 'Test Author' },
      category: 'tool',
      capabilities: [],
      permissions: [],
      events: [],
      routes: [],
      metrics: [],
      billing: { model: 'free' }
    };

    const result = await registry.registerPlugin(manifest);
    assert.equal(result, true, 'registerPlugin should return true for new plugin');
    assert.ok(registry.getPlugin('test-plugin-1'), 'Plugin should be retrievable after registration');
  });

  it('should return false when registering duplicate plugin (idempotent)', async function() {
    const manifest: PluginManifest = {
      id: 'test-plugin-2',
      name: 'Test Plugin 2',
      version: '1.0.0',
      description: 'A test plugin',
      author: { name: 'Test Author' },
      category: 'tool',
      capabilities: [],
      permissions: [],
      events: [],
      routes: [],
      metrics: [],
      billing: { model: 'free' }
    };

    await registry.registerPlugin(manifest);
    const result = await registry.registerPlugin(manifest);
    assert.equal(result, false, 'registerPlugin should return false for duplicate plugin');
  });

  it('should list all registered plugins', async function() {
    const manifest1: PluginManifest = {
      id: 'plugin-list-test-1',
      name: 'Plugin 1',
      version: '1.0.0',
      description: '',
      author: { name: 'Test' },
      category: 'tool',
      capabilities: [],
      permissions: [],
      events: [],
      routes: [],
      metrics: [],
      billing: { model: 'free' }
    };
    const manifest2: PluginManifest = {
      id: 'plugin-list-test-2',
      name: 'Plugin 2',
      version: '1.0.0',
      description: '',
      author: { name: 'Test' },
      category: 'tool',
      capabilities: [],
      permissions: [],
      events: [],
      routes: [],
      metrics: [],
      billing: { model: 'free' }
    };

    await registry.registerPlugin(manifest1);
    await registry.registerPlugin(manifest2);

    const plugins = registry.listPlugins();
    assert.equal(plugins.length, 2, 'Should list two plugins');
    const ids = plugins.map(p => p.id);
    assert.include(ids, 'plugin-list-test-1');
    assert.include(ids, 'plugin-list-test-2');
  });

  it('should enable a plugin', async function() {
    const manifest: PluginManifest = {
      id: 'enable-test-plugin',
      name: 'Enable Test',
      version: '1.0.0',
      description: '',
      author: { name: 'Test' },
      category: 'tool',
      capabilities: [],
      permissions: [],
      events: [],
      routes: [],
      metrics: [],
      billing: { model: 'free' }
    };

    await registry.registerPlugin(manifest);
    const enabled = await registry.enablePlugin('enable-test-plugin');
    assert.equal(enabled, true, 'enablePlugin should return true');
    const plugin = registry.getPlugin('enable-test-plugin');
    assert(plugin, 'Plugin should exist after enable');
    // Note: The registry service doesn't update manifest status on enable in this stub
  });

  it('should disable a plugin', async function() {
    const manifest: PluginManifest = {
      id: 'disable-test-plugin',
      name: 'Disable Test',
      version: '1.0.0',
      description: '',
      author: { name: 'Test' },
      category: 'tool',
      capabilities: [],
      permissions: [],
      events: [],
      routes: [],
      metrics: [],
      billing: { model: 'free' }
    };

    await registry.registerPlugin(manifest);
    const disabled = await registry.disablePlugin('disable-test-plugin');
    assert.equal(disabled, true, 'disablePlugin should return true');
  });

  it('should remove a plugin', async function() {
    const manifest: PluginManifest = {
      id: 'remove-test-plugin',
      name: 'Remove Test',
      version: '1.0.0',
      description: '',
      author: { name: 'Test' },
      category: 'tool',
      capabilities: [],
      permissions: [],
      events: [],
      routes: [],
      metrics: [],
      billing: { model: 'free' }
    };

    await registry.registerPlugin(manifest);
    const removed = await registry.removePlugin('remove-test-plugin');
    assert.equal(removed, true, 'removePlugin should return true');
    assert.equal(registry.getPlugin('remove-test-plugin'), null, 'Plugin should be removed');
  });

  it('should check plugin permission', async function() {
    const manifest: PluginManifest = {
      id: 'permission-test-plugin',
      name: 'Permission Test',
      version: '1.0.0',
      description: '',
      author: { name: 'Test' },
      category: 'tool',
      capabilities: [],
      permissions: ['storage:get', 'queue:submit'],
      events: [],
      routes: [],
      metrics: [],
      billing: { model: 'free' }
    };

    await registry.registerPlugin(manifest);
    const hasStorage = await registry.checkPluginPermission('permission-test-plugin', 'storage:get');
    assert.equal(hasStorage, true, 'Should have storage:get permission');
    const hasChat = await registry.checkPluginPermission('permission-test-plugin', 'chat.generate');
    assert.equal(hasChat, false, 'Should not have chat.generate permission');
  });

  it('should convert legacy manifest to new format', function() {
    const legacy = {
      id: 'legacy-beauty',
      name: 'Legacy Beauty',
      version: '0.1.0',
      routes: ['/api/apps/beauty/*'],
      permissions: ['storage:put', 'storage:get']
    };

    const manifest = legacyToManifest(legacy, { name: 'Legacy Author' });
    assert.equal(manifest.id, 'legacy-beauty');
    assert.equal(manifest.name, 'Legacy Beauty');
    assert.equal(manifest.version, '0.1.0');
    assert.equal(manifest.permissions.length, 2);
    assert.include(manifest.permissions, 'storage:put');
    assert.include(manifest.permissions, 'storage:get');
    assert.equal(manifest.routes.length, 1);
  });
});
