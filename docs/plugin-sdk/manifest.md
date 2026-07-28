# Plugin Manifest Specification

The `PluginSDKManifest` defines the structure of a plugin manifest that is fully compatible with Platform-011.

## Full Specification

```ts
export type PluginSDKManifest = {
  /** Unique plugin identifier (slug) */
  id: string;
  
  /** Human-readable plugin name */
  name: string;
  
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  
  /** Short description of the plugin's purpose */
  description: string;
  
  /** Plugin author information */
  author: {
    name: string;           /* Author's full name */
    email?: string;         /* Author's email address (optional) */
    url?: string;           *Author's website or profile URL (optional)*
  };
  
  /** Plugin category for organization and discovery */
  category: string;
  
  /** Required permissions for plugin operation */
  permissions: string[];
  
  /** Events the plugin subscribes to or emits */
  events: {
    name: string;           /* Event name */
    description: string;    /* Event description */
    schema?: Record<string, unknown>; /* Optional event payload schema */
  }[];
  
  /** Metrics the plugin exposes for monitoring */
  metrics: {
    name: string;           /* Metric name */
    description: string;    /* Metric description */
    type: 'counter' | 'gauge' | 'histogram'; /* Metric type */
    unit: 'count' | 'bytes' | 'ms' | 'percent'; /* Metric unit */
  }[];
  
  /** Plugin dependencies (package ID -> version range) */
  dependencies?: Record<string, string>;
};
```

## Validation

The SDK provides a `validateManifest()` function that checks a manifest against these requirements:

```ts
import { validateManifest } from '@platform/plugin-sdk';

const myManifest = { /* ... */ };
validateManifest(myManifest); // Throws if invalid
```

## Field Details

### id

Unique plugin identifier. Must be a non-empty string containing only lowercase alphanumeric characters, hyphens, and underscores. Typical format: `[a-z0-9_-]+`.

### name

Human-readable name displayed in the plugin marketplace and management UI.

### version

Semantic version number following [SemVer](https://semver.org/) conventions (e.g., `1.0.0`, `2.1.3-beta`).

### description

A brief (ideally under 160 characters) summary of what the plugin does.

### author.name

Required - the author or maintainer's name.

### author.email

Optional - contact email for the author.

### author.url

Optional - website or profile page for the author.

### category

Categorization for organization. Common values include: `tool`, `analysis`, `chat`, `workflow`, `admin`, `connector`, `storage`.

### permissions

Array of permission strings that the plugin requires during execution. These must align with the platform's permission model. Examples: `storage:get`, `storage:put`, `billing:usage`, `queue:submit`.

### events

Array of events that the plugin is interested in or may emit. Each event has a name, description, and optional schema defining the expected payload structure.

### metrics

Array of custom metrics that the plugin will report. Each metric specifies its name, description, type (counter/gauge/histogram), and unit.

### dependencies

Optional mapping of dependent plugin IDs to version constraints. Format: `{ "plugin-id": "^1.0.0" }`.
