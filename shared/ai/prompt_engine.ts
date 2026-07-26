import { getLogger } from "../logger";
const log = getLogger("prompt_engine");
import { renderTemplate, injectRuntimeVariables } from "./context_builder";
import type { AIPromptTemplate, AIRequest } from "./types";

let templatesCache: AIPromptTemplate[] = [];
let dbLoaded = false;

export async function loadTemplatesFromDB(env: any): Promise<void> {
    if (dbLoaded) return;
    try { const db = env?.DB;
        if (db && db.prepare) {
            const rows: any[] = await db.prepare("SELECT * FROM ai_prompt_templates ORDER BY version DESC").all();
            templatesCache = (rows||[]).map((r:any)=>({id:r.id,name:r.name,scenario:r.scenario,content:r.content,version:r.version,isActive:!!r.is_active,variables:r.variables?JSON.parse(r.variables):[],metadata:r.metadata?JSON.parse(r.metadata):{}}));
            dbLoaded = true; log.info("Prompts loaded",{count:templatesCache.length});
        }
    } catch(e){log.error("Prompt load failed",{error:String(e)});}
}

export async function getActivePrompt(templateName: string, env: any): Promise<AIPromptTemplate|null> {
    if (!dbLoaded) await loadTemplatesFromDB(env);
    const cands = templatesCache.filter(t=>t.name===templateName&&t.isActive).sort((a,b)=>b.version-a.version);
    return cands[0]||null;
}

export async function getAllPrompts(env: any): Promise<AIPromptTemplate[]> {
    if (!dbLoaded) await loadTemplatesFromDB(env);
    return [...templatesCache];
}

export async function buildFinalPrompt(scenarioKey: string, variables: Record<string,any>, knowledgeContext?: string, env?: any): Promise<string> {
    const template = await getActivePrompt(scenarioKey, env!);
    let prompt = "";
    if (template) prompt = renderTemplate(template.content, {...variables});
    else { const defs:Record<string,string>={beauty:"Analyze image.",chat:"You are helpful.",translate:"Translate text.",summary:"Summarize text.",code:"Expert programmer."}; prompt = defs[scenarioKey]||"Process."; }
    prompt = injectRuntimeVariables(prompt, variables.userId);
    if (knowledgeContext) prompt += "\n[Knowledge]\n"+knowledgeContext;
    return prompt;
}