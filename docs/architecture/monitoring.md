# Monitoring Center Architecture
## Overview
The Monitoring Center provides centralized observability across all platform modules.
## Components
- Types: shared/monitoring/types.ts
- Repositories: shared/monitoring/repositories/
- Service: shared/monitoring/services/monitoring.service.ts
- Health Checks: shared/monitoring/health/
- API Endpoints: functions/api/monitoring/

## Database Migration
- drizzle/0043_monitoring_center.sql: system_metrics, system_alerts, health_checks, performance_snapshots tables
