import { EXPLORATION_BUNDLE_PRICE, EXPLORATION_BUNDLE_SLUG, getProduct } from './products';
import type { Purchase } from '../lib/types';

export interface BenefitTier {
  threshold: number;
  name: string;
  action: 'archive' | 'diagnosis' | 'playbook' | 'partner';
  actionLabel: string;
  summary: string;
  deliverable: string;
  details: string[];
}

export const BENEFIT_TIERS: BenefitTier[] = [
  {
    threshold: 99,
    name: '成长档案',
    action: 'archive',
    actionLabel: '生成我的学习档案',
    summary: '把最近一次能力评估变成可执行的四星期学习路线。',
    deliverable: '下载一份包含六维短板、每周目标、检查清单和复测节点的个人学习档案。',
    details: ['自动读取最近一次评估结果', '识别最弱两个能力维度', '每周围绕一个可交付成果安排任务']
  },
  {
    threshold: 299,
    name: '路径诊断',
    action: 'diagnosis',
    actionLabel: '提交月度诊断申请',
    summary: '每月一次书面学习路径诊断，不走模板回复。',
    deliverable: '提交当前目标、每周可用时间和卡点，客服回复一份不少于 800 字的个性化路线建议。',
    details: ['结合你的评估历史与已购内容', '明确下一阶段学什么、先跳过什么', '给出可验证的完成标准']
  },
  {
    threshold: 699,
    name: '工程资料包',
    action: 'playbook',
    actionLabel: '下载工程实践资料包',
    summary: '获得可直接套用的工程模板与检查清单。',
    deliverable: '下载《工程实践资料包》，内含项目说明模板、调试日志、代码评审清单与发布检查表。',
    details: ['模板可直接复制到真实项目', '面向作品集、课程项目和团队协作', '随平台内容持续维护']
  },
  {
    threshold: 1299,
    name: '研究伙伴',
    action: 'partner',
    actionLabel: '申请季度项目复盘',
    summary: '每季度一次个人项目书面复盘，重点看架构与下一阶段路线。',
    deliverable: '提交项目说明、仓库链接或当前瓶颈，获得一份结构化的项目复盘报告与后续里程碑建议。',
    details: ['关注真实代码组织与工程质量', '输出风险清单和下一季度里程碑', '适合长期学习与作品集建设']
  }
];

export function purchaseValue(slug: string): number {
  if (slug === EXPLORATION_BUNDLE_SLUG) return EXPLORATION_BUNDLE_PRICE;
  return getProduct(slug)?.price || 0;
}

export function confirmedSpend(purchases: Purchase[]): number {
  return purchases
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + purchaseValue(p.product_slug), 0);
}

export function tierState(spent: number) {
  const unlocked = BENEFIT_TIERS.filter((t) => spent >= t.threshold);
  const next = BENEFIT_TIERS.find((t) => spent < t.threshold) || null;
  return { unlocked, next };
}
