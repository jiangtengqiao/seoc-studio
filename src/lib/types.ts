export type Category = 'subscription' | 'specialized' | 'exploration';

export interface IssuePlan {
  no: number;
  title: string;
  lang?: string;
  note?: string;
}

export interface Product {
  slug: string;
  category: Category;
  index: number;
  title: string;
  titleEn?: string;
  price: number;
  unit: string;
  issuesTotal?: number;
  wordsPerIssue?: string;
  maintenance: string;
  updating: string;
  perks: string[];
  materialsIncluded: boolean;
  lang: string;
  audience?: string;
  description: string;
  toc: IssuePlan[];
}

export interface Profile {
  id: string;
  email: string;
  nickname: string | null;
  role: 'user' | 'admin';
  qq_bound: boolean;
  wechat_bound: boolean;
  linked_accounts: string[];
  created_at: string;
}

export interface Issue {
  id: string;
  product_slug: string;
  issue_no: number;
  title: string;
  lang: string;
  word_count: number;
  content_md: string;
  patches: { title: string; body: string }[];
  published_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  published_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  product_slug: string;
  issue_range: string;
  status: 'pending' | 'confirmed' | 'rejected';
  note: string | null;
  created_at: string;
}

export interface Material {
  id: string;
  product_slug: string;
  title: string;
  file_path: string;
  size: string;
}

export const CATEGORY_META: Record<Category, { name: string; nameEn: string; tone: string; path: string }> = {
  subscription: {
    name: '订阅式项目',
    nameEn: 'Subscription Collection',
    tone: '一次性购入，永久查阅，持续维护和更新',
    path: '/products/subscription'
  },
  specialized: {
    name: '专研式项目',
    nameEn: 'Specialized Series',
    tone: '分期交付，每期正文不少于 5000 汉字，持续维护但不持续更新',
    path: '/products/specialized'
  },
  exploration: {
    name: '探索式项目',
    nameEn: 'Exploration Journals',
    tone: '高阶学者向，初学者慎入，含 QQ 群与微信群学术交流',
    path: '/products/exploration'
  }
};

export const CONTACT_EMAIL = 'jiangtengqiao@qq.com';
export const COMPANY_CN = '编程研究与探索';
export const COMPANY_EN = 'Study and Explore of Coding';
export const BRAND = 'SEOC Studio';
