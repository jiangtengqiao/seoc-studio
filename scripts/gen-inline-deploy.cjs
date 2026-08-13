// 生成控制台部署用的内联版 Edge Function
// 将 supabase/functions/_shared/ai-providers.ts 内联进 ai-chat / ai-api-proxy，
// 输出到 supabase/functions/.deploy/*-inline.ts。
// 用法：node scripts/gen-inline-deploy.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sharedPath = path.join(root, 'supabase/functions/_shared/ai-providers.ts');

function inlineShared() {
  let src = fs.readFileSync(sharedPath, 'utf8');
  // 去掉 export 关键字（内联版为单文件，无需导出）
  src = src.replace(/^export\s+(async\s+)?(function|const|interface)\s/gm, '$1$2 ');
  src = src.replace(/^export\s+type\s+/gm, 'type ');
  return src;
}

function buildInline(fnName, outName, importPattern) {
  const fnPath = path.join(root, 'supabase/functions', fnName, 'index.ts');
  let fn = fs.readFileSync(fnPath, 'utf8');
  // 移除对 _shared 的 import 块
  const before = fn.length;
  fn = fn.replace(importPattern, '');
  if (fn.length === before) {
    console.error(`[!] ${fnName}: 未匹配到 _shared import 块，请检查正则`);
    process.exitCode = 1;
    return;
  }
  const header =
    `// ============================================================\n` +
    `// 内联：ai-providers.ts（厂商适配器与计费）\n` +
    `// 由 scripts/gen-inline-deploy.js 自动生成，请勿手工编辑\n` +
    `// ============================================================\n`;
  const out = fn.replace(
    /import \{ createClient \} from 'https:\/\/esm\.sh\/@supabase\/supabase-js@2';/,
    `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';\n\n${header}\n${inlineShared()}`
  );
  const outPath = path.join(root, 'supabase/functions/.deploy', outName);
  fs.writeFileSync(outPath, out);
  console.log(`[ok] ${outName} (${out.split('\n').length} lines)`);
}

buildInline(
  'ai-chat',
  'ai-chat-inline.ts',
  /import\s*\{[\s\S]*?\}\s*from\s*'\.\.\/_shared\/ai-providers\.ts';\s*/
);
buildInline(
  'ai-api-proxy',
  'ai-api-proxy-inline.ts',
  /import\s*\{[\s\S]*?\}\s*from\s*'\.\.\/_shared\/ai-providers\.ts';\s*/
);
