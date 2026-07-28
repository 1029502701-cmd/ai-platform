import { type PagesFunction } from "@cloudflare/workers-types";
import { MonitoringService } from "../../../shared/monitoring/services/monitoring.service";
import { hasRoleForRequest } from "../../../shared/services/permission";

export const onRequestPost: PagesFunction = async (context) => {
  const { request, env } = context;
  
  // Check permissions - Super Admin only for write operations
  const isSuperAdmin = await hasRoleForRequest("super_admin", { env, request });
  
  if (!isSuperAdmin) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: { code: "FORBIDDEN", message: "Super Admin required" } 
    }), { 
      status: 403, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    const body = await request.json();
    const checkName = body.checkName;
    const module = body.module || "unknown";
    
    if (!checkName) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: { code: "BAD_REQUEST", message: "checkName is required" } 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const monitoringService = new MonitoringService(env);
    
    // Map check name to actual health check function
    // In a real implementation, we would have a registry of check functions
    const result = await monitoringService.healthCheck(checkName, module as any, async () => {
      // Simulated check - in practice this would call the actual service
      return { timestamp: new Date().toISOString(), checked: true };
    });
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: result 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: { code: "SERVER_ERROR", message: error?.message || "Server error" } 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
};
