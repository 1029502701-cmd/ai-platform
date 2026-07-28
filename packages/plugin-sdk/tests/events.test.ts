import { PluginEventEmitter, eventEmitter, PluginEventName } from "../events/emitter";

describe("Event Emitter", () => {
  it("should emit and subscribe to events", () => {
    const calls: string[] = [];
    eventEmitter.subscribe("test.event", (payload) => {
      calls.push(payload.eventName);
    });
    eventEmitter.emit("test.event", { timestamp: new Date().toISOString() });
    assert.equal(calls.length, 1);
  });

  it("should have correct event name types", () => {
    const names: PluginEventName[] = ["plugin.installed", "plugin.enabled", "plugin.disabled"];
    assert.equal(names.length, 3);
  });
});
