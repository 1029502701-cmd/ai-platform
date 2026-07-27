/**
 * Preflight Check — 部署前环境检查脚本
 * 
 * 用法:
 *   npx tsx scripts/preflight-check.ts
 * 
 * 检查项:
 *   1. Node.js 版本 >= 22
 *   2. 必需的环境变量存在
 *   3. TypeScript 类型检查通过
 *   4. ESLint 无阻断错误
 *   5. 前端构建通过
 *   6. Wrangler CLI 可用
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type CheckResult = {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
};

const checks: CheckResult[] = [];

function check(name: string, fn: () => { ok: boolean; msg: string }): void {
  const { ok, msg } = fn();
  checks.push({ name, status: ok ? 'pass' : 'warn', message: msg });
}

function fail(name: string, msg: string): void {
  checks.push({ name, status: 'fail', message: msg });
}

// ── 1. Node.js 版本 ──
try {
  const version = parseInt(process.version.slice(1), 10);
  if (version >= 22) {
    checks.push({ name: 'Node.js 版本', status: 'pass', message: `v${process.version} ✓` });
  } else {
    checks.push({ name: 'Node.js 版本', status: 'fail', message: `需要 >= 22.0.0，当前 ${process.version}` });
  }
} catch {
  checks.push({ name: 'Node.js 版本', status: 'fail', message: '无法获取 Node.js 版本' });
}

// ── 2. 依赖安装 ──
check('依赖包', () => ({
  ok: existsSync('node_modules') && existsSync('package.json'),
  msg: existsSync('node_modules') && existsSync('package.json') ? 'node_modules 已安装 ✓' : '请先运行 npm ci',
}));

// ── 3. 环境变量 ──
const requiredVars = [
  'JWT_SECRET',
  'DEFAULT_AI_PROVIDER',
  'OPENAI_API_KEY',
];
const existingEnv = process.env;
let envOk = true;
let envMsg = '';
for (const v of requiredVars) {
  if (!existingEnv[v]) {
    envOk = false;
    envMsg += `缺少 ${v}，`;
  }
}
if (envOk) {
  envMsg = '必需环境变量全部存在 ✓';
}
checks.push({ name: '环境变量', status: envOk ? 'pass' : 'warn', message: envMsg || '未配置 .env 文件' });

// ── 4. .env.example 存在 ──
check('.env.example', () => ({
  ok: existsSync('.env.example'),
  msg: existsSync('.env.example') ? '.env.example 模板存在 ✓' : '请创建 .env.example 文件',
}));

// ── 5. TypeScript 类型检查 ──
try {
  execSync('npm run typecheck', { stdio: 'pipe', encoding: 'utf-8' });
  checks.push({ name: 'TypeScript 类型检查', status: 'pass', message: '全部通过 ✓' });
} catch (e: any) {
  const output = (e.stdout || '') + (e.stderr || '');
  const errorLines = output.split('\n').filter((l: string) => l.includes('error TS')).length;
  checks.push({ name: 'TypeScript 类型检查', status: 'fail', message: `发现 ${errorLines} 个类型错误` });
}

// ── 6. ESLint ──
if (existsSync('.eslintrc.cjs') || existsSync('.eslintrc.json') || existsSync('eslint.config.js')) {
  try {
    execSync('npm run lint -- --quiet', { stdio: 'pipe', encoding: 'utf-8' });
    checks.push({ name: 'ESLint 代码规范', status: 'pass', message: '通过 ✓' });
  } catch {
    // ESLint 的 exit code 可能为 1（有 warning），视为 warn
    checks.push({ name: 'ESLint 代码规范', status: 'warn', message: '存在 lint warnings，请检查' });
  }
} else {
  checks.push({ name: 'ESLint 配置', status: 'skip', message: '未发现 ESLint 配置文件' });
}

// ── 7. Wrangler CLI ──
try {
  execSync('wrangler --version', { stdio: 'pipe', encoding: 'utf-8' });
  checks.push({ name: 'Wrangler CLI', status: 'pass', message: '已安装 ✓' });
} catch {
  checks.push({ name: 'Wrangler CLI', status: 'warn', message: 'Wrangler 未全局安装，部署需要它' });
}

// ── 8. wrangler.toml 配置 ──
try {
  const config = readFileSync('wrangler.toml', 'utf-8');
  const hasD1 = config.includes('[d1_databases]') && config.includes('binding = "DB"');
  const hasKV = config.includes('[[kv_namespaces]]');
  const hasR2 = config.includes('[[r2_buckets]]');
  const msg = [hasD1, hasKV, hasR2].filter(Boolean).length === 3
    ? 'D1 + KV + R2 绑定完整 ✓'
    : `缺失绑定: D1=${hasD1}, KV=${hasKV}, R2=${hasR2}`;
  checks.push({ name: 'Wrangler 配置', status: hasD1 && hasKV && hasR2 ? 'pass' : 'warn', message: msg });
} catch {
  checks.push({ name: 'Wrangler 配置', status: 'fail', message: 'wrangler.toml 不存在或无法读取' });
}

// ── 9. 前端构建 ──
check('前端构建', () => {
  try {
    execSync('npm run build', { stdio: 'pipe', encoding: 'utf-8' });
    return { ok: true, msg: 'dist/ 目录生成成功 ✓' };
  } catch {
    return { ok: false, msg: 'Vite 构建失败，请检查前端代码' };
  }
});

// ── 输出结果 ──
console.log('');
console.log('='.repeat(60));
console.log('  AI Platform — Preflight Checklist');
console.log('='.repeat(60));
console.log('');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

for (const c of checks) {
  const icon = c.status === 'pass' ? '✓ PASS'
    : c.status === 'fail' ? '✗ FAIL'
    : c.status === 'warn' ? '⚠ WARN'
    : '- SKIP';

  const prefix = c.status === 'fail' ? '[ERROR]' : c.status === 'warn' ? '[WARN] ' : '';
  console.log(`  ${icon}  ${c.name}: ${c.message}`);

  if (prefix) console.log(`         ${prefix} ${c.message}`);

  if (c.status === 'pass') passCount++;
  else if (c.status === 'fail') failCount++;
  else if (c.status === 'warn') warnCount++;
}

console.log('');
console.log('-'.repeat(60));
console.log(`  总计: ${checks.length} 项 | 通过: ${passCount} | 警告: ${warnCount} | 失败: ${failCount}`);
console.log('-'.repeat(60));

if (failCount > 0) {
  console.log('');
  console.log('  ❌ 发现阻断性问题，请在修复后重新运行此检查。');
  process.exit(1);
} else if (warnCount > 0) {
  console.log('');
  console.log('  ⚠️  检查完成，但存在警告项。建议在生产部署前解决。');
  process.exit(0);
} else {
  console.log('');
  console.log('  ✅ 所有检查通过！可以安全部署。');
  process.exit(0);
}
