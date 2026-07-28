import { BaseLifecycleHooks, LifecycleContext, PluginLifecycleHooks } from "../lifecycle/hooks";

describe("Lifecycle Hooks", () => {
  it("should have BaseLifecycleHooks with all methods", () => {
    const hooks = new BaseLifecycleHooks();
    assert.isFunction(hooks.onInstall);
    assert.isFunction(hooks.onEnable);
    assert.isFunction(hooks.onDisable);
    assert.isFunction(hooks.onUninstall);
    assert.isFunction(hooks.onUpdate);
    assert.isFunction(hooks.initialize);
  });
});
