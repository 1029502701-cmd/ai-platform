// Prompt Manager
// Responsibilities:
//  - load prompt metadata and versions from D1 (env.DB) with KV cache (env.AI_PROMPT_CACHE)
//  - render prompt templates with variables and simple validation
//  - provide create/update/publish/rollback operations (admin protected)

type Prompt = {
  id: number;
  key: string;
  name?: string;
  category?: string;
  current_version_id?: number | null;
  status?: string;
  variables_schema?: any;
  allow_user_override?: boolean;
};

type PromptVersion = {
  id: number;
  prompt_id: number;
  version: number;
  content: string;
  variables?: any;
  meta?: any;
  status?: string;
};

const inMemoryPrompts: Record<string, Prompt> = {};
const inMemoryVersions: Record<number, PromptVersion> = {};

export async function loadPromptsFromBindings(env?: any): Promise<void> {
  // Try KV cache first
  try {
    const kv = env?.AI_PROMPT_CACHE;
    if (kv && kv.get) {
      const raw = await kv.get('prompts_json');
      const rawVersions = await kv.get('prompt_versions_json');
      if (raw && rawVersions) {
        const parsed = JSON.parse(raw);
        const parsedVersions = JSON.parse(rawVersions);
        for (const p of parsed) inMemoryPrompts[p.key] = p;
        for (const v of parsedVersions) inMemoryVersions[v.id] = v;
        return;
      }
    }
  } catch (e) {
    // ignore kv errors
  }

  // Fallback to D1
  try {
    const db = env?.DB;
    if (db && db.prepare) {
      const pRes = await db.prepare('SELECT id, key, name, category, current_version_id, status, variables_schema, allow_user_override FROM prompts').all();
      if (pRes && pRes.results) {
        for (const row of pRes.results) {
          inMemoryPrompts[row.key] = {
            id: row.id,
            key: row.key,
            name: row.name,
            category: row.category,
            current_version_id: row.current_version_id,
            status: row.status,
            variables_schema: row.variables_schema ? JSON.parse(row.variables_schema) : undefined,
            allow_user_override: !!row.allow_user_override,
          };
        }
      }
      const vRes = await db.prepare('SELECT id, prompt_id, version, content, variables, meta, status FROM prompt_versions').all();
      if (vRes && vRes.results) {
        for (const row of vRes.results) {
          inMemoryVersions[row.id] = {
            id: row.id,
            prompt_id: row.prompt_id,
            version: row.version,
            content: row.content,
            variables: row.variables ? JSON.parse(row.variables) : undefined,
            meta: row.meta ? JSON.parse(row.meta) : undefined,
            status: row.status,
          };
        }
      }
    }
  } catch (e) {
    // ignore DB errors
  }
}

export async function invalidatePromptCache(env?: any): Promise<void> {
  try {
    const kv = env?.AI_PROMPT_CACHE;
    if (kv && kv.put) {
      await kv.put('prompts_json', '');
      await kv.put('prompt_versions_json', '');
    }
  } catch (e) {
    // ignore
  }
  // reload
  await loadPromptsFromBindings(env);
}

export function getPromptFromMemory(key: string): Prompt | null {
  return inMemoryPrompts[key] || null;
}

export function getVersionFromMemory(versionId: number): PromptVersion | null {
  return inMemoryVersions[versionId] || null;
}

export function listPromptsFromMemory(): Prompt[] {
  return Object.values(inMemoryPrompts);
}

export async function createPromptInDB(env: any, payload: { key: string; name?: string; category?: string; variables_schema?: any; created_by?: string }) {
  const db = env?.DB;
  if (!db || !db.prepare) throw new Error('DB_NOT_AVAILABLE');
  await db.prepare('INSERT INTO prompts (key, name, category, variables_schema, created_by) VALUES (?, ?, ?, ?, ?)').run(payload.key, payload.name || null, payload.category || null, payload.variables_schema ? JSON.stringify(payload.variables_schema) : null, payload.created_by || null);
  await invalidatePromptCache(env);
}

export async function createVersionInDB(env: any, payload: { prompt_key: string; content: string; variables?: any; meta?: any; created_by?: string }) {
  const db = env?.DB;
  if (!db || !db.prepare) throw new Error('DB_NOT_AVAILABLE');
  // find prompt id
  const p = await db.prepare('SELECT id FROM prompts WHERE key = ?').get(payload.prompt_key);
  if (!p || !p.id) throw new Error('PROMPT_NOT_FOUND');
  // determine next version
  const maxV = await db.prepare('SELECT MAX(version) as v FROM prompt_versions WHERE prompt_id = ?').get(p.id);
  const nextV = (maxV && maxV.v) ? (maxV.v + 1) : 1;
  await db.prepare('INSERT INTO prompt_versions (prompt_id, version, content, variables, meta, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(p.id, nextV, payload.content, payload.variables ? JSON.stringify(payload.variables) : null, payload.meta ? JSON.stringify(payload.meta) : null, payload.created_by || null);
  await invalidatePromptCache(env);
}

export async function publishVersionInDB(env: any, versionId: number) {
  const db = env?.DB;
  if (!db || !db.prepare) throw new Error('DB_NOT_AVAILABLE');
  const v = await db.prepare('SELECT prompt_id FROM prompt_versions WHERE id = ?').get(versionId);
  if (!v || !v.prompt_id) throw new Error('VERSION_NOT_FOUND');
  await db.prepare('UPDATE prompts SET current_version_id = ?, status = ? WHERE id = ?').run(versionId, 'published', v.prompt_id);
  await db.prepare('UPDATE prompt_versions SET status = ? WHERE id = ?').run('published', versionId);
  await invalidatePromptCache(env);
}

export async function renderPrompt(key: string, variables: Record<string, any> | undefined, env?: any, options?: { allowDraft?: boolean }) : Promise<{ prompt: string; meta?: any }> {
  // load prompts if missing
  if (!getPromptFromMemory(key)) await loadPromptsFromBindings(env);
  const prompt = getPromptFromMemory(key);
  if (!prompt) throw new Error('PROMPT_NOT_FOUND');
  // choose version
  let versionId = prompt.current_version_id;
  if (options?.allowDraft && !versionId) {
    // try to find latest draft
    const versions = Object.values(inMemoryVersions).filter(v => v.prompt_id === prompt.id).sort((a,b) => b.version - a.version);
    if (versions.length) versionId = versions[0].id;
  }
  if (!versionId) throw new Error('NO_PUBLISHED_VERSION');
  const ver = getVersionFromMemory(versionId);
  if (!ver) throw new Error('VERSION_NOT_LOADED');

  if (ver.status !== 'published' && !options?.allowDraft) throw new Error('VERSION_NOT_PUBLISHED');

  // merge variables: ver.variables (defaults) <- prompt.variables_schema defaults <- runtime variables
  const merged: Record<string, any> = {};
  if (ver.variables) Object.assign(merged, ver.variables);
  if (prompt.variables_schema && typeof prompt.variables_schema === 'object') {
    for (const k of Object.keys(prompt.variables_schema)) {
      const def = prompt.variables_schema[k];
      if (def && def.default !== undefined) merged[k] = merged[k] ?? def.default;
    }
  }
  if (variables) Object.assign(merged, variables);

  // basic validation: required keys in variables_schema
  if (prompt.variables_schema && typeof prompt.variables_schema === 'object') {
    for (const k of Object.keys(prompt.variables_schema)) {
      const def = prompt.variables_schema[k];
      if (def && def.required && (merged[k] === undefined || merged[k] === null)) {
        throw new Error(`MISSING_VARIABLE:${k}`);
      }
    }
  }

  // perform safe replacement: replace {{var}} with escaped text
  let content = ver.content;
  content = content.replace(/{{\s*([a-zA-Z0-9_\.]+)\s*}}/g, (_m, p1) => {
    const val = merged[p1];
    if (val === undefined || val === null) return '';
    // escape newline and braces to reduce injection risk
    return String(val).replace(/\r\n|\r|\n/g, '\\n').replace(/{{/g, '{ {').replace(/}}/g, '} }');
  });

  return { prompt: content, meta: ver.meta };
}
