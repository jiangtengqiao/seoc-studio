import { isCloudEnabled, supabase } from './supabase';
import { EXPLORATION_BUNDLE_SLUG, getProduct } from '../data/products';
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

export function listLegalDocs(): { key: string; title: string; chars: number }[] {
  return Object.keys(legalModules).map((p) => {
    const key = p.split('/').pop()!.replace('.md', '');
    const raw = legalModules[p] as string;
    const chars = raw.replace(/[#*>\-|\s`()[\]:\/\.a-zA-Z0-9]/g, '').length;
    return { key, title: LEGAL_TITLES[key] || key, chars };
  });
}

export const LEGAL_TITLES: Record<string, string> = {
  'terms-of-service': '用户服务协议',
  'purchase-agreement': '数字内容购买协议',
  'privacy-policy': '隐私政策',
  disclaimer: '免责声明',
  'ip-notice': '知识产权与版权声明',
  'ip-complaint': '侵权投诉与维权指引',
  'refund-policy': '退款政策',
  'community-rules': '学术交流群社区规范',
  'minor-protection': '未成年人保护声明',
  'maintenance-policy': '内容维护与更新政策',
  'materials-license': '附赠资料使用许可',
  'anti-fraud': '举报与反假冒声明',
  'ai-service-agreement': '研智助手 AI 服务协议',
  'ai-credits-policy': '研点购买与消费协议',
  'ai-content-disclaimer': 'AI 生成内容免责声明',
  'ai-data-privacy': 'AI 数据处理与隐私补充声明',
  'ai-api-terms': 'API 开放平台服务条款',
  'ai-third-party-models': '第三方 AI 模型使用说明',
  'account-cancellation-policy': '用户账号注销与数据删除政策',
  'accessibility-statement': '无障碍声明',
  'ugc-policy': '用户生成内容（UGC）政策',
  'complaint-resolution-policy': '投诉处理与争议解决政策',
  'third-party-processors': '第三方服务提供商与数据子处理者清单',
  'gdpr-ccpa-compliance': 'GDPR/CCPA 合规补充声明',
  'data-security-incident-response': '数据安全与数据泄露应急响应政策',
  'acceptable-use-policy': '可接受使用政策',
  'vulnerability-report-policy': '网络安全漏洞报告与响应政策',
  'content-rating-standard': '内容分级与敏感信息标注规范',
  'enterprise-license-agreement': '企业合作与商业授权协议',
  'account-security-policy': '账号安全与身份验证政策',
  'security-testing-authorization': '安全测试授权与范围指引',
  'ai-content-rating-rules': 'AI生成内容分级标注实施细则',
  'enterprise-data-protection-addendum': '企业合作数据保护附录',
  'account-security-incident-guide': '账号安全事件应急指引',
  'moderator-community-guidelines': '讨论区版主与社区管理规范'
};

export const LEGAL_CATEGORIES: { name: string; keys: string[] }[] = [
  { name: '基础协议', keys: ['terms-of-service', 'privacy-policy', 'disclaimer', 'purchase-agreement', 'refund-policy'] },
  { name: '知识产权', keys: ['ip-notice', 'ip-complaint', 'materials-license', 'anti-fraud'] },
  { name: '社区与内容', keys: ['community-rules', 'ugc-policy', 'minor-protection', 'maintenance-policy', 'accessibility-statement', 'acceptable-use-policy', 'moderator-community-guidelines'] },
  { name: 'AI 服务协议', keys: ['ai-service-agreement', 'ai-credits-policy', 'ai-content-disclaimer', 'ai-data-privacy', 'ai-api-terms', 'ai-third-party-models', 'ai-content-rating-rules'] },
  { name: '账号与安全', keys: ['account-cancellation-policy', 'account-security-policy', 'account-security-incident-guide', 'data-security-incident-response', 'vulnerability-report-policy', 'security-testing-authorization'] },
  { name: '数据与隐私', keys: ['gdpr-ccpa-compliance', 'third-party-processors', 'complaint-resolution-policy'] },
  { name: '企业合作', keys: ['enterprise-license-agreement', 'enterprise-data-protection-addendum'] },
  { name: '内容分级', keys: ['content-rating-standard'] },
];

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
    body: '本站数字内容采用人工确认制。登录后可在产品页打开购买面板，使用支付宝收款码支付并提交付款信息。核对通过后自动开通，本站不进行任何促销优惠活动。',
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
      .order('created_at', { ascending: false });
    if (data) return data as Purchase[];
  }
  try {
    return JSON.parse(localStorage.getItem(`seoc.local.purchases.${userId}`) || '[]');
  } catch {
    return [];
  }
}

export function hasAccess(purchases: Purchase[], slug: string): boolean {
  return purchases.some((p) => {
    if (p.status !== 'confirmed') return false;
    if (p.product_slug === slug) return true;
    return p.product_slug === EXPLORATION_BUNDLE_SLUG && getProduct(slug)?.category === 'exploration';
  });
}
