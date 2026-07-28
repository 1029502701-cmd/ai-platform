import { type PagesFunction } from "@cloudflare/workers-types";
import { MonitoringService } from "../../../shared/monitoring/services/monitoring.service";
import { hasRoleForRequest } from "../../../shared/services/permission";

export const onRequestGet: PagesFunction = async (context) => {
  const { request, env } = context;
  
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
    const overview = await monitoringService.getDashboardOverview();
    
    return new Response(JSON.stringify({ 
      success: true, 
      data: overview 
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
