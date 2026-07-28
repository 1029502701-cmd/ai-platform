/**
 * Plugin Revenue Tests
 */

import {createPluginBillingService} from "../services/plugin_billing.service";
import {createRevenueShareService} from "../services/revenue_share.service";
import {eventAdapter} from "../../events/event_adapter";
import {metricsService} from "../../metrics/metrics.service";

describe("PluginRevenue", function() {
  let billingService;
  let revenueService;

  beforeAll(() => {
    billingService = createPluginBillingService(null as any);
    revenueService = createRevenueShareService();
  });

  test("should read pricing plans", async () => {
    const plans = await billingService.checkPluginPricing("test-plugin");
    expect(Array.isArray(plans)).toBe(true);
  });

  test("should calculate usage cost for credit-based plugin", async () => {
    const cost = await billingService.calculateUsageCost("credit-plugin", "generate", 1);
    expect(cost).toBeGreaterThan(0);
  });

  test("should record revenue transaction", async () => {
    const tx = await billingService.recordRevenue("plugin1", "dev1", "user1", "usage", 100);
    expect(tx.id).toBeTruthy();
    expect(tx.developerAmount).toBe(70);
  });

  test("should split revenue correctly", () => {
    const {platformFee, developerAmount} = revenueService.calculateSplit(100);
    expect(platformFee).toBe(30);
    expect(developerAmount).toBe(70);
  });

  test("should trigger plugin.revenue.created event", async () => {
    const events=[];
    eventAdapter.on("plugin.revenue.created",(e)=>events.push(e));
    await billingService.recordRevenue("p1","d1","u1","purchase",100);
    expect(events.length).toBe(1);
  });

  test("should update metrics on revenue", async () => {
    metricsService.set("plugin_revenue_total",0);
    await billingService.recordRevenue("p1","d1","u1","purchase",50);
    expect(metricsService.get("plugin_revenue_total")).toBe(50);
  });

});
