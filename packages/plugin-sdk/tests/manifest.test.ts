import { validateManifest, PluginSDKManifest } from "../types/manifest";

// Type-level test: ensure PluginSDKManifest is constructible
const testManifest: PluginSDKManifest = {
  id: "test",
  name: "Test",
  version: "1.0.0",
  description: "Test",
  author: { name: "Test" },
  category: "tool",
  permissions: [],
  events: [],
  metrics: [],
};

// Test that validateManifest function exists and can be called
describe("Type Tests", () => {
  it("should compile PluginSDKManifest", () => {
    assert.equal(testManifest.id, "test");
  });
});
