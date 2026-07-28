import { type PagesFunction } from "@cloudflare/workers-types";
import { MonitoringService } from "../../../shared/monitoring/services/monitoring.service";
import { hasRoleForRequest } from "../../../shared/services/permission";

export const onRequestGet: PagesFunction = async (context) => {
  const { request, env, params } = context;
  
  // Check permissions - Admin or Super Admin only
  const isAdmin = await hasRoleForRequest("admin", { env, request });
  const isSuperAdmin = await hasRoleForRequest("super_admin", { env, request });
  
  if (!isAdmin && !isSuperAdmin) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: { code: "FORBIDDEN", message: "Admin or Super Admin required" } 
    }), { 
      status: 403, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    const monitoringService = new MonitoringService(env);
    const metricName = params?.metricName || "";
    const module = params?.module || "";
    const days = parseInt(params?.days || "7", 10);
    
    if (!metricName) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: { code: "BAD_REQUEST", message: "metricName is required" } 
      }), { 
        status: 400, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    
    const metrics = await monitoringService.queryMetrics(metricName, { module, days });
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: { metricName, metrics } 
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
