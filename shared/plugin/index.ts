/** Plugin Ecosystem Foundation - Public API entry point */
export { PluginManifest, PluginStatus, PluginCapabilityType } from "./types";
export type { PluginModel } from "./models/plugins";
export { PluginRegistryService } from "./services/registry.service";
export { PluginLifecycleService } from "./lifecycle/lifecycle.service";
export { eventAdapter } from "./events/event.adapter";
export { metricsService } from "./metrics/metrics.service";
export { legacyToManifest } from "./types";
export { PluginVersionService, versionService } from "./services/plugin_version.service";
export { PluginManagementService, managementService } from "./services/plugin_management.service";
