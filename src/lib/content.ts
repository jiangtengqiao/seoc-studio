import { isCloudEnabled, supabase } from './supabase';
import type { Announcement, Issue, Material, Purchase } from './types';

const legalModules = import.meta.glob('../content/legal/*.md', { eager: true, query: '?raw', import: 'default' });
const issueModules = import.meta.glob('../content/issues/*.md', { eager: true, query: '?raw', import: 'default' });

function pick(mods: Record<string, unknown>, key: string): string | null {
  for (const [path, raw] of Object.entries(mods)) {
    if (path.endsWith('/' + key + '.md')) return raw as string;
  }
  return null;
}

export function getLegalDoc(key: string): string | null {
  return pick(legalModules as Record<string, unknown>, key);
}

export function listLegalDocs(): { key: string; title: string }[] {
  return Object.keys(legalModules).map((p) => {
    const key = p.split('/').pop()!.replace('.md', '');
    return { key, title: LEGAL_TITLES[key] || key };
  });
}

export const LEGAL_TITLES: Record<string, string> = {
  'terms-of-service': '用户服务协议',
  'purchase-agreement': '数字内容购买协议',
  'privacy-policy': '隐私政策',
  disclaimer: '免责声明',
  'ip-notice': '知识产权与版权声明',
  'refund-policy': '退款政策',
  'community-rules': '学术交流群社区规范',
  'minor-protection': '未成年人保护声明',
  'maintenance-policy': '内容维护与更新政策',
  'materials-license': '附赠资料使用许可',
  'anti-fraud': '举报与反假冒声明'
};

function parseIssue(raw: string): Omit<Issue, 'id' | 'published_at'> | null {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const meta: Record<string, string> = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return {
    product_slug: meta.product || '',
    issue_no: Number(meta.issue || 0),
    title: meta.title || '未命名',
    lang: meta.lang || '中文',
    word_count: Number(meta.words || 0),
    content_md: m[2],
    patches: []
  };
}

export function getLocalIssue(slug: string, issueNo: number): Issue | null {
  const raw = pick(issueModules as Record<string, unknown>, `${slug}--${issueNo}`);
  if (!raw) return null;
  const parsed = parseIssue(raw);
  if (!parsed) return null;
  return { ...parsed, id: `${slug}-${issueNo}`, published_at: '' };
}

export function listLocalIssues(slug: string): Issue[] {
  const out: Issue[] = [];
  for (const [path, raw] of Object.entries(issueModules)) {
    const name = path.split('/').pop()!.replace('.md', '');
    if (!name.startsWith(slug + '--')) continue;
    const parsed = parseIssue(raw as string);
    if (parsed) out.push({ ...parsed, id: name, published_at: '' });
  }
  return out.sort((a, b) => a.issue_no - b.issue_no);
}

export async function fetchIssue(slug: string, issueNo: number): Promise<Issue | null> {
  if (isCloudEnabled && supabase) {
    const { data } = await supabase
      .from('issues')
      .select('*')
      .eq('product_slug', slug)
      .eq('issue_no', issueNo)
      .maybeSingle();
    if (data) return data as Issue;
  }
  return getLocalIssue(slug, issueNo);
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  if (isCloudEnabled && supabase) {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false });
    if (data) return data as Announcement[];
  }
  const raw = pick(legalModules as Record<string, unknown>, '__announcements__');
  void raw;
  return LOCAL_ANNOUNCEMENTS;
}

export const LOCAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'SEOC Studio 官网正式上线',
    body: '编程研究与探索（Study and Explore of Coding）官方网站正式上线。三大门类内容将陆续连载，欢迎关注。',
    pinned: true,
    published_at: '2026-08-09T00:00:00Z'
  },
  {
    id: 'a2',
    title: '关于购买流程的说明',
    body: '本站数字内容采用人工确认制。选购后请通过邮箱 jiangtengqiao@qq.com 联系开通，本站不进行任何促销优惠活动。',
    pinned: false,
    published_at: '2026-08-09T00:00:00Z'
  }
];

export async function fetchMaterials(slug: string): Promise<Material[]> {
  if (isCloudEnabled && supabase) {
    const { data } = await supabase.from('materials').select('*').eq('product_slug', slug);
    if (data) return data as Material[];
  }
  return [];
}

export async function fetchPurchases(userId: string): Promise<Purchase[]> {
  if (isCloudEnabled && supabase) {
    const { data } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'confirmed');
    if (data) return data as Purchase[];
  }
  try {
    return JSON.parse(localStorage.getItem(`seoc.local.purchases.${userId}`) || '[]');
  } catch {
    return [];
  }
}

export function hasAccess(purchases: Purchase[], slug: string): boolean {
  return purchases.some((p) => p.product_slug === slug && p.status === 'confirmed');
}
