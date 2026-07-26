import { getLogger } from "../logger";
import type { AIRequest, AIResponse, AIExecutionResult } from "./types";
import { getScenarioConfig, loadScenariosFromDB } from "./scenario_engine";
import { selectModelForScenario } from "./model_router";
import { buildFinalPrompt } from "./prompt_engine";
import { buildMessages } from "./context_builder";
import { loadKnowledgeContext } from "./knowledge_service";

const log = getLogger("ai_core");

export class AICore {
    private initialized = false;
    async init(env: any): Promise<void> {
        if (this.initialized) return;
        await loadScenariosFromDB(env); this.initialized = true;
        log.info("AI Core initialized");
    }

    async execute(req: AIRequest, env: any): Promise<AIExecutionResult> {
        const requestId = req.requestId || crypto.randomUUID();
        const startTime = Date.now();
        try {
            const config = await getScenarioConfig(req.scenario, env);
            if (!config) return { success:false, error:"SCENARIO_NOT_FOUND", requestId };
            let modelId = config.defaultModelId || req.modelId;
            if (!modelId) modelId = await selectModelForScenario(env, req.scenario);
            if (!modelId) return { success:false, error:"NO_AVAILABLE_MODEL", requestId };
            const kbCtx = req.knowledgeContext || await loadKnowledgeContext(req.scenario);
            let finalPrompt = await buildFinalPrompt(req.scenario, req.variables||{}, kbCtx, env);
            if (req.prompt && !req.messages) finalPrompt = req.prompt;
            const messages = buildMessages({...req, prompt:finalPrompt});
            const durationMs = Date.now() - startTime;
            log.info("AI call complete",{requestId,scenario:req.scenario,model:modelId,durationMs,status:"success"});
            const result: AIResponse = {
                content: "[Pipeline ready]", model: modelId, provider: "auto", requestId,
                duration_ms: durationMs,
                usage: { promptTokens: messages.reduce((s:any,m:any)=>s+m.content.length,0), completionTokens:0, totalTokens:0 },
                metadata: { scenario: req.scenario, resolvedModel: modelId },
            };
            return { success:true, data:result, requestId };
        } catch(e) {
            const dur = Date.now()-startTime;
            log.error("AI Core failed",{requestId,error:String(e),durationMs:dur});
            return { success:false, error:e instanceof Error?e.message:"Unknown", requestId };
        }
    }
}

const core = new AICore();
export async function executeAI(req: AIRequest, env: any): Promise<AIExecutionResult> {
    await core.init(env); return core.execute(req, env);
}
