import { getLogger } from "../logger";
const log = getLogger("tool_registry");

export interface AIToolDef { name: string; description: string; parametersSchema?: object; enabled: boolean; }
let toolsCache: AIToolDef[] = [];

export async function loadToolsFromDB(env: any): Promise<AIToolDef[]> {
    try { const db = env?.DB;
        if (db && db.prepare) {
            const rows: any[] = await db.prepare("SELECT id,name,description,parameters_schema,enabled FROM ai_tools WHERE enabled=1").all();
            toolsCache=(rows||[]).map((r:any)=>({name:r.name,description:r.description,parametersSchema:r.parameters_schema?JSON.parse(r.parameters_schema):{},enabled:true}));
            log.info("Tools loaded",{count:toolsCache.length});
        }
    } catch(e){log.warn("Tool loading failed",{error:String(e)});}
    return toolsCache;
}

export async function getAvailableTools(): Promise<AIToolDef[]> { return toolsCache.filter(t=>t.enabled); }

export async function executeTool(toolName: string, args: any): Promise<unknown|null> {
    log.info("Tool called",{name:toolName});
    switch(toolName) { case "calculator": try{return{result:eval(String(args.expression))};}catch{return{error:"Invalid expression"}}; default: return{note:"Not implemented"}; }
}
