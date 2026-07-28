# Runbook: AI SaaS Platform Operations

## Quick Reference

| Symptom | Action | Severity |
|---------|--------|----------|
| API returns 500 | Check Wrangler logs → `wrangler tails ai-platform` | P1 |
| D1 connection timeout | Verify database_id in wrangler.toml | P1 |
| KV unavailable | Check KV namespace binding | P2 |
| Queue backlog > 1000 | Scale workers or check processing logic | P2 |
| AI Provider down | Switch to fallback provider via config | P3 |
| Billing webhook failure | Check payment callback endpoint | P1 |
| Memory/CPU high | Review worker cold starts | P3 |

---

## Troubleshooting Steps

### Step 1: Verify Services Are Running
```bash
curl -s https://ai-platform-boa.pages.dev/api/health | jq .
curl -s https://ai-platform-boa.pages.dev/api/health/live
curl -s https://ai-platform-boa.pages.dev/api/health/ready
```

### Step 2: Check Wrangler Logs
```bash
npx wrangler tails --project-name=ai-platform
```

### Step 3: Review Recent Deployments
```bash
npx wrangler pages deployment list --project-name=ai-platform-boa
```

### Step 4: Rollback if Needed
```bash
npx wrangler pages deployment rollback <deployment-id>
```

### Step 5: Verify Database Connectivity
```sql
-- In Cloudflare Dashboard → Workers & Pages → D1 → Queries
SELECT count(*) FROM tenants;
SELECT count(*) FROM users;
```

---

## Incident Response

### P1: Complete Outage
1. Assess scope (all users vs specific tenant)
2. Check monitoring → identify failing component
3. If D1 issue: verify account/D1 instance health
4. If Worker issue: roll back last deployment
5. Communicate status → update incident channel
6. Root cause analysis within 24h

### P2: Partial Degradation
1. Identify affected endpoints/services
2. Enable fallback mechanisms
3. Schedule fix in next release cycle
4. Document in incidents log

### P3: Minor Issue
1. Log in issue tracker
2. Fix in next PR or sprint
3. No immediate escalation needed

---

## Maintenance Procedures

### Regular Updates
- **Monthly**: Dependency audit (`npm audit`)
- **Weekly**: Review Wrangler error logs
- **Quarterly**: Database migration review

### Backup Strategy
- D1: Manual export via Cloudflare Dashboard
- KV: Export to R2 on schedule
- R2: Versioned with lifecycle policies

### Change Management
1. Create feature branch
2. Submit PR with test coverage
3. CI checks pass automatically
4. Manual approval for production deploy
5. Health verification post-deploy

---

## Contact & Escalation

| Level | Contact | Method |
|-------|---------|--------|
| L1 | On-call engineer | GitHub Issues |
| L2 | Platform team lead | Slack/WeChat |
| L3 | CTO | Direct message |

---

## Recovery Checklist

- [ ] Verify all health endpoints return 200
- [ ] Check worker logs for errors
- [ ] Confirm D1 connectivity
- [ ] Test authentication flow
- [ ] Validate billing transactions
- [ ] Verify queue processing
- [ ] Check knowledge retrievals
- [ ] Monitor error rates for 15min
- [ ] Notify stakeholders of recovery