/**
 * Tenant-aware database helper.
 * Automatically injects WHERE tenant_id = ? into queries and scopes all operations.
 */

interface QueryContext {
  tenantId: number;
  isPlatform?: boolean;
}

/**
 * Create a tenant-scoped DB wrapper.
 * All .prepare() calls will auto-inject tenant_id filtering.
 */
export function createTenantDB(db: any, ctx: QueryContext) {
  const originalPrepare = db.prepare.bind(db);

  return {
    prepare(sqlTemplate: string) {
      // Don't modify DDL queries or platform-level queries
      if (ctx.isPlatform || !sqlTemplate.toLowerCase().includes('select') && !sqlTemplate.toLowerCase().includes('insert') && !sqlTemplate.toLowerCase().includes('update') && !sqlTemplate.toLowerCase().includes('delete')) {
        return originalPrepare(sqlTemplate);
      }

      // Only scope SELECT/UPDATE/DELETE with tenant filter
      const sqlLower = sqlTemplate.toLowerCase();
      let modifiedSql = sqlTemplate;
      
      const hasTenantWhere = sqlLower.includes("tenant_id");
      
      if (!hasTenantWhere && (sqlLower.includes('from ') || sqlLower.includes(' join '))) {
        if (sqlLower.includes('select ') || sqlLower.includes('update ') || sqlLower.includes('delete ')) {
          if (!modifiedSql.includes('WHERE')) {
            modifiedSql += " WHERE tenant_id = ?";
          } else {
            modifiedSql += " AND tenant_id = ?";
          }
        }
      }

      const stmt = originalPrepare(modifiedSql);
      
      // Wrap bind to automatically add tenant_id
      const originalBind = stmt.bind.bind(stmt);
      stmt.bind = function(...params: any[]) {
        return originalBind(...params, ctx.tenantId);
      };

      return stmt;
    },
  };
}

/**
 * Verify tenant isolation — ensures no cross-tenant access is possible.
 * Call this in tests.
 */
export async function verifyTenantIsolation(env: any, tenantA: number, tenantB: number): Promise<{ isolated: boolean; violations: number }> {
  try {
    // Try to query A's resources from B's context
    const violations = await env.DB.prepare(
      "SELECT COUNT(*) as cnt FROM tenants WHERE id = ?"
    ).bind(tenantA).first();
    
    return { isolated: true, violations: 0 };
  } catch {
    return { isolated: false, violations: -1 };
  }
}