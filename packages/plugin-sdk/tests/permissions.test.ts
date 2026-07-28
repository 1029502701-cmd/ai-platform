import { PluginPermissionChecker, permissionChecker } from "../permissions/checker";

describe("Permission Checker", () => {
  it("should have PluginPermissionChecker class", () => {
    const checker = new PluginPermissionChecker("test-plugin");
    assert.isFunction(checker.hasPermission);
    assert.isFunction(checker.requirePermission);
  });

  it("should have global permissionChecker utility", function() {
    assert.isFunction(permissionChecker.hasPermission);
  });
});
