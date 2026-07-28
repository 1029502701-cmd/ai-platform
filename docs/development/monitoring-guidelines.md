# Monitoring Center Development Guidelines

## Adding a New Metric
1. Define the metric name in your module
2. Call monitoringService.recordMetric({ metricName: '', value: , module: '' })

## Adding a Health Check
1. Implement a check function in shared/monitoring/health/
2. Register it in HEALTH_CHECKS map
3. Call monitoringService.healthCheck()
