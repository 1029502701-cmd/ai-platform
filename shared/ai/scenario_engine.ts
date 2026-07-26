import { getLogger } from "../logger";
const log = getLogger("scenario_engine");

const DEFAULT_SCENARIOS: Record<string, any> = {
    beauty:{key:"beauty",name:"AI Beauty Analysis",defaultModelId:"openai-gpt-4o-mini",temperature:0.3,maxTokens:512,supportedModels:["openai-gpt-4o-mini","openai-gpt-4o"]},
    chat:{key:"chat",name:"AI Chat Assistant",defaultModelId:"deepseek-chat",temperature:0.7,maxTokens:2048,supportedModels:["deepseek-chat","openai-gpt-4o-mini","gemini-pro"]},
    translate:{key:"translate",name:"AI Translation",defaultModelId:"gemini-pro",temperature:0.2,maxTokens:4096,supportedModels:["gemini-pro"]},
    image:{key:"image",name:"AI Image Generation",defaultModelId:"dall-e-3",temperature:0.8,maxTokens:100,supportedModels:["dall-e-3"]},
    summary:{key:"summary",name:"AI Summary",defaultModelId:"openai-gpt-4o-mini",temperature:0.5,maxTokens:1024,supportedModels:["openai-gpt-4o-mini"]},
    code:{key:"code",name:"AI Code Assistant",defaultModelId:"claude-opus",temperature:0.3,maxTokens:4096,supportedModels:["claude-opus","claude-sonnet"]},
};

let cachedScenarios: Record<string, any> = {};
let dbLoaded = false;

export async function loadScenariosFromDB(env: any): Promise<Record<string, any>> {
    if (dbLoaded && Object.keys(cachedScenarios).length > 0) return cachedScenarios;
    try { const db = env?.DB; if (db && db.prepare) {
        const rows: any[] = await db.prepare("SELECT key,name,description,default_model_id,temperature,max_tokens,supported_models,status FROM ai_scenarios WHERE status='active'").all();
        if (rows?.length) { for (const row of rows) {
            cachedScenarios[row.key] = { key:row.key,name:row.name,description:row.description||"",defaultModelId:row.default_model_id||null,temperature:row.temperature!=null?row.temperature:0.7,maxTokens:row.max_tokens||2048,supportedModels:row.supported_models?JSON.parse(row.supported_models):[],status:"active" };
        } dbLoaded = true; log.info("Scenarios loaded from DB",{count:rows.length}); return cachedScenarios; }
    }} catch(e){log.error("Failed to load scenarios",{error:String(e)});}
    return DEFAULT_SCENARIOS;
}

export async function getScenarioConfig(scenarioKey: string, env?: any): Promise<any> {
    let s = cachedScenarios; if (!dbLoaded || Object.keys(s).length===0) s = await loadScenariosFromDB(env);
    return s[scenarioKey] || null;
}

export async function getAllScenarios(env?: any): Promise<any[]> {
    let s = cachedScenarios; if (!dbLoaded || Object.keys(s).length===0) s = await loadScenariosFromDB(env);
    return Object.values(s);
}

export function resolveModelForScenario(scenarioKey: string, overrideModelId?: string): {modelId:string|null;temperature:number;maxTokens:number} {
    const sc = DEFAULT_SCENARIOS[scenarioKey]; if (!sc) return { modelId:overrideModelId||null, temperature:0.7, maxTokens:2048 };
    return { modelId:overrideModelId||sc.defaultModelId, temperature:sc.temperature, maxTokens:sc.maxTokens };
}
