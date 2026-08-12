import io

# content.ts: listLegalDocs 增加字数统计
p = 'src/lib/content.ts'
s = io.open(p, encoding='utf-8', newline='').read()
old = """export function listLegalDocs(): { key: string; title: string }[] {
  return Object.keys(legalModules).map((p) => {
    const key = p.split('/').pop()!.replace('.md', '');
    return { key, title: LEGAL_TITLES[key] || key };
  });
}"""
new = """export function listLegalDocs(): { key: string; title: string; chars: number }[] {
  return Object.keys(legalModules).map((p) => {
    const key = p.split('/').pop()!.replace('.md', '');
    const raw = legalModules[p] as string;
    const chars = raw.replace(/[#*>\\-|\\s`()[\\]:\\/\\.a-zA-Z0-9]/g, '').length;
    return { key, title: LEGAL_TITLES[key] || key, chars };
  });
}"""
assert old in s
s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('content.ts ok')

# Legal.tsx: 目录显示字数
p2 = 'src/pages/Legal.tsx'
s2 = io.open(p2, encoding='utf-8', newline='').read()
old2 = '                  <span className="text-xs text-slate-400">查看全文</span>'
new2 = '                  <span className="text-xs text-slate-400">约 {d.chars.toLocaleString()} 字 · 查看全文</span>'
assert old2 in s2
s2 = s2.replace(old2, new2, 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(s2)
print('Legal.tsx ok')
