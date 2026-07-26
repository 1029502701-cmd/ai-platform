import { getLogger } from "../logger";
const log = getLogger("model_router");

interface ModelEntry { modelId:string; provider:string; priority:number; status:string; }
let cache: ModelEntry[]|null = null; let lastLoad = 0; const TTL_MS = 60000;

async function refreshCache(env: any): Promise<ModelEntry[]> {
    const now = Date.now();
    if (cache && (now-lastLoad)<TTL_MS) return cache;
    try { const db = env?.DB;
        if (db && db.prepare) {
            const rows: any[] = await db.prepare("SELECT model_id,provider,priority,COALESCE(status,'active') as status FROM ai_models ORDER BY priority DESC").all();
            cache=(rows||[]).map((r:any)=>({modelId:r.model_id,provider:r.provider,priority:r.priority??50,status:r.status})); lastLoad=now;
        }
    } catch(e){log.warn("Model cache failed",{error:String(e)});}
    return cache||[];
}

export async function selectBestModel(env: any, scenarioKey?: string): Promise<ModelEntry|null> {
    const models = await refreshCache(env);
    return models.find(m=>m.status!=="disabled")||null;
}

export async function getModelById(env: any, modelId: string): Promise<ModelEntry|null> {
    return (await refreshCache(env)).find(m=>m.modelId===modelId)||null;
}

export async function selectModelForScenario(env: any, scenarioKey: string): Promise<string|null> {
    try { const db = env?.DB;
        if (db && db.prepare) {
            const sc: any = await db.prepare("SELECT default_model_id FROM ai_scenarios WHERE key=? AND status='active'").bind(scenarioKey).first();
            if (sc?.default_model_id) { const m = await getModelById(env, sc.default_model_id); if (m) return m.modelId; }
        }
    } catch{}
    return (await selectBestModel(env))?.modelId||null;
}
