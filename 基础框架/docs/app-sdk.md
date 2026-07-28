# App SDK Reference

## App Manifest

Every app in the marketplace must have a manifest:

```typescript
interface AppManifest {
  slug: string;               // Unique identifier (e.g., "beauty-pro")
  name: string;
  version: string;            // Semver (e.g., "2.1.0")
  author: string;
  description: string;
  icon?: string;              // URL or base64 SVG
  category: AppCategory;      // beauty|writing|office|...
  permissions: string[];      // Required capabilities
  entry: {                    // How users access this app
    type: 'page' | 'api' | 'embed';
    path?: string;            // For page entries
    endpoint?: string;        // For API entries
  };
  billing: {
    type: 'free' | 'one-time' | 'subscription';
    priceCents?: number;
    planId?: string;
    trialDays?: number;
  };
  features: string[];         // Feature flags
}
```

## Installation Flow

1. User browses `/marketplace`
2. Clicks "Install" → POST /api/marketplace/apps/install
3. System creates `marketplace_app_installs` record
4. App becomes available at configured entry point
5. If paid → billing charge before installation

## Update Flow

1. New version published to `marketplace_app_versions`
2. Client checks for updates via GET /api/marketplace/apps/:slug/update-check
3. If update available → user notified
4. Update installs atomically (old version backed up)