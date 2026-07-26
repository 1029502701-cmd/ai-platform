import type { AIRequest } from "./types";

export function buildMessages(req: AIRequest): Array<{role:string;content:string}> {
    const msgs: Array<{role:string;content:string}> = [];
    if (req.options?.systemPrompt) msgs.push({role:"system",content:req.options.systemPrompt});
    if (req.knowledgeContext) msgs.push({role:"system",content:"[Knowledge]\n"+req.knowledgeContext});
    if (req.messages && req.messages.length>0) msgs.push(...req.messages.map((m:any)=>({role:m.role.toLowerCase(),content:m.content})));
    else if (req.prompt) msgs.push({role:"user",content:req.prompt});
    return msgs;
}

export function renderTemplate(template: string, vars: Record<string,any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_m,k:string) => vars[k]!=null ? String(vars[k]) : _m);
}

export function injectRuntimeVariables(prompt: string, userId?: string): string {
    return prompt.replace("{{user}}",userId||"Anonymous").replace("{{time}}",new Date().toISOString()).replace("{{language}}","zh-CN");
}
