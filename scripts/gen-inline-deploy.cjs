// 生成控制台部署用的内联版 Edge Function
// 将 supabase/functions/_shared/rest.ts 与 ai-providers.ts 内联进 ai-chat / ai-api-proxy，
// 输出到 supabase/functions/.deploy/*-inline.ts（完全自包含，零外部 import）。
// 用法：node scripts/gen-inline-deploy.cjs
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sharedDir = path.join(root, 'supabase/functions/_shared');

function inlineModule(fileName) {
  let src = fs.readFileSync(path.join(sharedDir, fileName), 'utf8');
  // 去掉 export 关键字（内联版为单文件，无需导出）
  src = src.replace(/^export\s+(async\s+)?(function|const|interface|class)\s/gm, '$1$2 ');
  src = src.replace(/^export\s+type\s+/gm, 'type ');
  return src;
}

function buildInline(fnName, outName) {
  const fnPath = path.join(root, 'supabase/functions', fnName, 'index.ts');
  let fn = fs.readFileSync(fnPath, 'utf8');

  let hasRest = false;
  let hasProviders = false;

  // 移除对 _shared/rest.ts 的 import（单行）
  const restImport = /import\s*\{[^{}]*\}\s*from\s*'\.\.\/_shared\/rest\.ts';\s*/g;
  if (restImport.test(fn)) hasRest = true;
  fn = fn.replace(restImport, '');

  // 移除对 _shared/ai-providers.ts 的 import（多行块；块内无嵌套花括号，用 [^{}]* 安全匹配）
  const providersImport = /import\s*\{[^{}]*\}\s*from\s*'\.\.\/_shared\/ai-providers\.ts';\s*/g;
  if (providersImport.test(fn)) hasProviders = true;
  fn = fn.replace(providersImport, '');

  if (!hasRest && !hasProviders) {
    console.error(`[!] ${fnName}: 未匹配到任何 _shared import，请检查正则`);
    process.exitCode = 1;
    return;
  }

  const header =
    `// ============================================================\n` +
    `// 内联模块：rest.ts（零依赖 PostgREST 客户端）+ ai-providers.ts（厂商适配）\n` +
    `// 由 scripts/gen-inline-deploy.cjs 自动生成，请勿手工编辑\n` +
    `// ============================================================\n`;

  const out = `${header}\n${hasRest ? inlineModule('rest.ts') : ''}\n${hasProviders ? inlineModule('ai-providers.ts') : ''}\n${fn}`;

  const outPath = path.join(root, 'supabase/functions/.deploy', outName);
  fs.writeFileSync(outPath, out);

  // 验证：不允许残留任何 import 行
  const importLines = out.split('\n').filter((l) => /^\s*import\s/.test(l));
  if (importLines.length > 0) {
    console.error(`[!] ${outName}: 仍残留 import 行: ${importLines.join(' | ')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[ok] ${outName} (${out.split('\n').length} lines, rest=${hasRest}, providers=${hasProviders})`);
}

buildInline('ai-chat', 'ai-chat-inline.ts');
buildInline('ai-api-proxy', 'ai-api-proxy-inline.ts');
