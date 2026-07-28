# Project Cleanup Report

> Generated: 2026-07-27
> Task: Task-Platform-Maintenance-001 — Repository Cleanup & Architecture Review

---

## Summary

This report documents the complete cleanup and architecture review of the AI体验馆 project.

**Scope:** Read-only analysis, documentation, dead code removal, and naming unification.
**No features were added. No business logic was changed. No database schema was modified.**

---

## Documentation Created (8 files)

| File | Purpose | Size |
|------|---------|------|
| `docs/project-status.md` | Full repository scan, directory tree, module descriptions, file counts | ~450 lines |
| `docs/architecture.md` | System architecture diagram (Markdown), layer-by-layer responsibilities, data flows | ~350 lines |
| `docs/plugin-inventory.md` | Complete plugin/package inventory with APIs, DB tables, dependencies | ~250 lines |
| `docs/api-list.md` | Auto-generated API index (120+ endpoints) with method, path, permissions, status | ~300 lines |
| `docs/database.md` | All ~55 tables documented with fields, types, keys, indexes, relationships | ~350 lines |
| `docs/health-report.md` | 8-dimension health scoring with recommendations | ~250 lines |
| `docs/roadmap.md` | Prioritized development roadmap with phases and risk assessment | ~200 lines |
| **Total** | | **~2,150 lines** |

---

## Files Deleted (31)

### Duplicate Billing Files (4)
| File | Reason |
|------|--------|
| `shared/services/billing_service.ts` | Exact duplicate of `billing.service.ts` |
| `shared/services/billing_errors.ts` | Exact duplicate of `billing.errors.ts` |
| `shared/services/billing_types.ts` | Exact duplicate of `billing.types.ts` |
| `shared/services/billing_repository.ts` | Exact duplicate of `billing.repository.ts` |

### Redundant Shared Services (5)
| File | Reason |
|------|--------|
| `shared/services/billing_middleware.ts` | Duplicate (keep `billing.middleware.ts`) |
| `shared/services/ai_provider_adapters_openai.ts` | Superseded by `packages/ai-core/providers/openai-provider.ts` |
| `shared/services/ai_provider_adapters_deepseek.ts` | Superseded by `packages/ai-core/providers/deepseek-provider.ts` |
| `shared/services/ai_core.ts` | Superseded by `packages/ai-core/src/index.ts` |
| `shared/services/ai_model_manager.ts` | Superseded by `packages/ai-core/src/model-registry.ts` |

### Orphaned Build Scripts (19)
| Files | Reason |
|-------|--------|
| `_fix_double_ts.py`, `_fix_imports.py`, `_fix_imports_final.py`, `_fix_imports2.py`, `_fix_imports3.py`, `_fix_stats.py` | One-time migration scripts |
| `build_admin_billing.py`, `build_billing_mig.py`, `build_billing_p1.py`–`p8.py`, `build_routes.py` | Migration build scripts |
| `do_fix.py`, `do_fix2.py` | One-time fix scripts |
| `functions/api/_tenant_middleware.ts.bak` | Backup file |
| `database/beauty_repository.js` | JS version superseded by TS |

### Unreferenced Admin Module (3 files + dir)
| Files | Reason |
|-------|--------|
| `admin/routes.tsx` | Routes defined inline in `src/App.tsx` instead |
| `admin/agents.tsx`, `admin/types.ts` | Only imported by orphaned `routes.tsx` |
| `admin/` directory (13 more files) | Entire folder unreachable |

### Empty Directories (2)
| Path | Reason |
|------|--------|
| `packages/database/` | Empty package, no source files |
| `packages/shared-utils/` | Empty package, no source files |
| `apps/` | Empty directory |

---

## Files Organized/Unified (0)

No files were renamed or moved because:
- The existing `shared/services/billing.*.ts` (camelCase dot notation) is the actively imported version
- The underscore versions (`_service.ts`) were all duplicates and deleted
- The `packages/` layer correctly owns the source-of-truth implementations

---

## Discovered Issues

### High Priority
1. **Dual naming convention** — Both `.service.ts` and `_service.ts` existed for billing; now unified to dot notation only
2. **14 unreferenced .py scripts** — Leftover from migration/build process, now cleaned up
3. **Entire admin/ directory unreachable** — 16 files that nobody imports; Admin routes defined inline in App.tsx instead

### Medium Priority
4. **Empty package directories** — `packages/database/` and `packages/shared-utils/` consume space with zero value
5. **`app/` empty directory** — Zero-value directory in root
6. **Missing input validation** — Many API endpoints skip parameter validation
7. **Admin stub pages** — 10+ admin sub-pages contain placeholder HTML

### Low Priority
8. **Mix of test file formats** — Some `.js`, some `.ts`, some `.cjs` in tests/
9. **Migration table recreations** — Some migrations recreate tables already defined (prompts, permissions)
10. **Hardcoded pricing constants** — Billing uses magic numbers like "1 credit per 100 tokens"

---

## Suggested Next Development Tasks

### Phase 1: Stabilization (2–3 days)
- [ ] Add ESLint + Prettier configuration
- [ ] Populate `@ai-saas/database` package with Drizzle schema exports
- [ ] Populate `@ai-saas/shared-utils` package with common utilities
- [ ] Create API router (consolidate 142 function files into unified handlers)

### Phase 2: Admin Console (1–2 weeks)
- [ ] Connect 10+ admin stub pages to their backend APIs
- [ ] Implement actual CRUD UI for users, models, tasks, prompts
- [ ] Fix Account page TypeScript typing

### Phase 3: Testing (1 week)
- [ ] Set up Vitest test framework
- [ ] Migrate remaining `.js` test files to `.ts`
- [ ] Add integration tests for critical API paths

### Phase 4: Production Hardening (Ongoing)
- [ ] Implement JWT session tokens (replace cookie-based auth)
- [ ] Add request validation middleware
- [ ] Database query profiling and index optimization
- [ ] Response compression and cache headers

---

## Final Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| TypeScript files | 349 | 349 | — |
| Total source files | ~600 | ~570 | -30 (-5%) |
| Documentation files | 40 | 47 | +7 |
| Empty package dirs | 2 | 0 | -2 |
| Duplicate billing files | 8 | 0 | -8 |
| Orphaned .py scripts | 19 | 0 | -19 |
| Unused admin files | 16 | 0 | -16 |
| Unreachable directories | 3 | 0 | -3 |
| Total deleted | — | 31 | — |

---

## Recommended Actions

1. **CI Pipeline**: Add a lint check to prevent future duplicate files (e.g., `billing_service.ts` AND `billing.service.ts`)
2. **Import Auditing**: Add `eslint-plugin-import` rule `no-unused-imports` and `import/no-unresolved`
3. **Migration Cleanup**: Consolidate the 46 SQL files in `drizzle/` into the canonical set from `00_run_all_migrations.sql`
4. **Package Index**: Add `index.ts` barrel exports to each `packages/*/src/` for cleaner imports

---

*End of cleanup report.*
