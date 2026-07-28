import { PluginMetricsClient, metrics, StandardMetricNames } from "../metrics/client";

describe("Metrics Client", () => {
  it("should create a PluginMetricsClient instance", () => {
    const client = new PluginMetricsClient("test-plugin");
    assert.isFunction(client.increment);
    assert.isFunction(client.gauge);
    assert.isFunction(client.timing);
  });

  it("should have global metrics utility", () => {
    assert.isFunction(metrics.increment);
    assert.isFunction(metrics.gauge);
  });

  it("should define standard metric names", () => {
    assert.equal(StandardMetricNames.USAGE_TOTAL, "plugin_usage_total");
    assert.equal(StandardMetricNames.ERROR_TOTAL, "plugin_error_total");
  });
});
