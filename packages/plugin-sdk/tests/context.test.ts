import { PluginContext, createPluginContext, setPluginContext, context } from "../context";
import { PluginSDKManifest } from "../types/manifest";
import { BaseLifecycleHooks } from "../lifecycle/hooks";

describe("PluginContext", () => {
  it("should create a PluginContext instance", () => {
    const manifest: PluginSDKManifest = {
      id: "test",
      name: "Test",
      version: "1.0.0",
      description: "Test",
      author: { name: "Test" },
      category: "tool",
      permissions: [],
      events: [],
      metrics: [],
      dependencies: {}
    };
    
    const ctx = createPluginContext("test", manifest);
    assert.equal(ctx.pluginId, "test");
    assert.equal(ctx.manifest.name, "Test");
    assert.isFunction(ctx.logger.info);
    assert.isFunction(ctx.metrics.increment);
  });

  it("should have context getter that initializes", () => {
    // Set a dummy context first
    const mockCtx = { pluginId: "test", logger: {}, eventBus: {}, metrics: {}, billing: {}, hooks: {}, manifest: {}, permissions: {} } as any;
    setPluginContext(mockCtx);
    assert.equal(context.get().pluginId, "test");
  });
});
