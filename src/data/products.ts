import type { Product } from '../lib/types';

export const PRODUCTS: Product[] = [
  {
    slug: 'python-origin',
    category: 'subscription',
    index: 1,
    title: 'Python 的起源研究与探索',
    titleEn: 'Origins of Python: Research and Exploration',
    price: 39,
    unit: '一次性购入，永久查阅',
    maintenance: '持续维护',
    updating: '持续更新',
    wordsPerIssue: '每章正文不少于 8000 汉字',
    perks: ['永久查阅', '持续维护与更新', '研究脉络逐年补写'],
    materialsIncluded: false,
    lang: '中文',
    description:
      '追溯 Python 自 ABC 语言至 Guido van Rossum 创立之初的完整脉络，覆盖设计哲学、关键版本、社区治理与未来走向，是一部持续修订的语言起源研究读物。',
    toc: [
      { no: 1, title: 'ABC 语言与 Amoeba 项目背景' },
      { no: 2, title: 'Guido van Rossum 与 1989 年圣诞假期' },
      { no: 3, title: '设计哲学与 Python 之禅' },
      { no: 4, title: 'Python 2 与 Python 3 的分野' },
      { no: 5, title: '社区治理与 BDFL 的退位' },
      { no: 6, title: '当代生态与未来走向' }
    ]
  },
  {
    slug: 'cpp-origin',
    category: 'subscription',
    index: 2,
    title: 'C++ 的起源研究与探索',
    titleEn: 'Origins of C++: Research and Exploration',
    price: 39,
    unit: '一次性购入，永久查阅',
    maintenance: '持续维护',
    updating: '持续更新',
    wordsPerIssue: '每章正文不少于 8000 汉字',
    perks: ['永久查阅', '持续维护与更新', '标准演进逐年补写'],
    materialsIncluded: false,
    lang: '中文',
    description:
      '从 C with Classes 到现代 C++ 标准委员会治理，梳理 Bjarne Stroustrup 的设计取舍、标准化历程与性能哲学的来源。',
    toc: [
      { no: 1, title: 'Simula 影响与 C with Classes' },
      { no: 2, title: 'Bjarne Stroustrup 的设计取舍' },
      { no: 3, title: '标准化之路 C++98 到 C++11' },
      { no: 4, title: '现代 C++ 的范式转变' },
      { no: 5, title: '零开销抽象原则考据' },
      { no: 6, title: '委员会治理与未来标准' }
    ]
  },
  {
    slug: 'python-guide',
    category: 'subscription',
    index: 3,
    title: 'Python 使用指南',
    titleEn: 'Python Practical Guide',
    price: 69,
    unit: '一次性购入，永久查阅',
    maintenance: '持续维护',
    updating: '持续更新',
    wordsPerIssue: '每章正文不少于 8000 汉字',
    perks: ['编辑器配置指导', '语法指导与详情', '工程实践与排错', '永久查阅'],
    materialsIncluded: false,
    lang: '中文',
    description:
      '面向日常使用的完整指南，覆盖编辑器与解释器配置、核心语法、标准库、虚拟环境、调试与工程化实践，随语言版本持续修订。',
    toc: [
      { no: 1, title: '环境搭建与编辑器配置' },
      { no: 2, title: '核心语法总览' },
      { no: 3, title: '数据结构与惯用法' },
      { no: 4, title: '函数、类与模块' },
      { no: 5, title: '标准库精选' },
      { no: 6, title: '虚拟环境与包管理' },
      { no: 7, title: '调试、测试与性能' },
      { no: 8, title: '工程化与发布' }
    ]
  },
  {
    slug: 'cpp-guide',
    category: 'subscription',
    index: 4,
    title: 'C++ 使用指南',
    titleEn: 'C++ Practical Guide',
    price: 75,
    unit: '一次性购入，永久查阅',
    maintenance: '持续维护',
    updating: '持续更新',
    wordsPerIssue: '每章正文不少于 8000 汉字',
    perks: ['编辑器配置指导', '语法指导与详情', '构建系统与排错', '永久查阅'],
    materialsIncluded: false,
    lang: '中文',
    description:
      '与 Python 使用指南同构的 C++ 版本，覆盖编译器与编辑器配置、现代语法、STL、构建系统、调试与工程实践。',
    toc: [
      { no: 1, title: '编译器与编辑器配置' },
      { no: 2, title: '现代 C++ 语法总览' },
      { no: 3, title: '内存模型与资源管理' },
      { no: 4, title: 'STL 容器与算法' },
      { no: 5, title: '模板与泛型编程' },
      { no: 6, title: 'CMake 与构建系统' },
      { no: 7, title: '调试、 sanitizers 与性能' },
      { no: 8, title: '工程化与发布' }
    ]
  },
  {
    slug: 'python-trainable-ai',
    category: 'specialized',
    index: 1,
    title: 'Python 自行制作可训练人工智能 AI 系列教程',
    titleEn: 'Build a Trainable AI with Python',
    price: 369,
    unit: '系列教程',
    issuesTotal: 10,
    wordsPerIssue: '每期正文不少于 10000 汉字',
    maintenance: '持续维护',
    updating: '不持续更新',
    perks: ['中英双语', '附赠资料', '从零实现可训练模型', '异议请投送电子邮件'],
    materialsIncluded: true,
    lang: '中文 + English',
    description:
      '不依赖大型框架，以纯 Python 与 NumPy 逐步构建可训练的人工智能系统，覆盖张量、自动求导、优化器与训练循环，中英双语对照。',
    toc: [
      { no: 1, title: '张量与计算图基础', lang: '中英' },
      { no: 2, title: '自动求导引擎实现', lang: '中英' },
      { no: 3, title: '线性层与激活函数', lang: '中英' },
      { no: 4, title: '损失函数与优化器', lang: '中英' },
      { no: 5, title: '训练循环与批处理', lang: '中英' },
      { no: 6, title: '卷积算子的手工实现', lang: '中英' },
      { no: 7, title: '循环结构与序列建模', lang: '中英' },
      { no: 8, title: '注意力机制剖析', lang: '中英' },
      { no: 9, title: '模型保存与推理部署', lang: '中英' },
      { no: 10, title: '完整项目：训练一个小型语言模型', lang: '中英' }
    ]
  },
  {
    slug: 'python-advanced-charts',
    category: 'specialized',
    index: 2,
    title: 'Python 图表的高级制作与表达系列教程',
    price: 169,
    unit: '系列教程',
    issuesTotal: 6,
    wordsPerIssue: '每期正文不少于 10000 汉字',
    maintenance: '持续维护',
    updating: '不持续更新',
    perks: ['附赠资料', '出版级图表规范', '异议请投送电子邮件'],
    materialsIncluded: true,
    lang: '仅中文',
    description:
      '从图形语法到出版级表达，系统讲解 Matplotlib 与同类库的深层机制，让图表准确传达结论而非仅仅好看。',
    toc: [
      { no: 1, title: '图形语法与图表的选择' },
      { no: 2, title: 'Matplotlib 对象模型精讲' },
      { no: 3, title: '色彩、字体与版式' },
      { no: 4, title: '统计图表与不确定性表达' },
      { no: 5, title: '交互图表与仪表盘' },
      { no: 6, title: '出版级输出与自动化流水线' }
    ]
  },
  ...([3, 4, 5, 6, 7] as const).map((i) => {
    const levels = [
      { key: 'beginner', name: '入门级', price: 29, materials: false },
      { key: 'intermediate', name: '中级', price: 45, materials: true },
      { key: 'advanced', name: '高级', price: 79, materials: true },
      { key: 'master', name: '大师级', price: 139, materials: true },
      { key: 'supreme', name: '顶级', price: 229, materials: true }
    ];
    const lv = levels[i - 3];
    return {
      slug: `python-games-${lv.key}`,
      category: 'specialized' as const,
      index: i,
      title: `Python 制作各类游戏的简单教程（${lv.name}）`,
      price: lv.price,
      unit: '分级教程',
      issuesTotal: 4,
      wordsPerIssue: '每期正文不少于 10000 汉字',
      maintenance: '持续维护',
      updating: '不持续更新',
      perks: lv.materials ? ['附赠资料', '异议请投送电子邮件'] : ['仅简单教程，不附赠资料', '异议请投送电子邮件'],
      materialsIncluded: lv.materials,
      lang: '中文',
      description: `以游戏项目驱动的 Python 实践教程，${lv.name}内容对应不同的代码组织与算法深度。`,
      toc: [
        { no: 1, title: '项目骨架与游戏循环' },
        { no: 2, title: '输入、碰撞与状态' },
        { no: 3, title: '关卡与资源管理' },
        { no: 4, title: '完整项目实战' }
      ]
    };
  }),
  {
    slug: 'beyond-games-premium',
    category: 'specialized',
    index: 8,
    title: '超越游戏的存在（尊享级）',
    titleEn: 'Beyond Games: Premium',
    price: 339,
    unit: '尊享级项目',
    issuesTotal: 6,
    wordsPerIssue: '每期正文不少于 10000 汉字',
    maintenance: '持续维护',
    updating: '不持续更新',
    perks: ['附赠资料', '较复杂项目', '引擎级架构讲解', '异议请投送电子邮件'],
    materialsIncluded: true,
    lang: '中文',
    description:
      '面向完成游戏系列的学习者，讲解超越单一游戏的系统性架构，包括自绘渲染管线、脚本系统与工具链，属于较复杂项目。',
    toc: [
      { no: 1, title: '从游戏到引擎的认知跃迁' },
      { no: 2, title: '自绘渲染管线' },
      { no: 3, title: '实体组件系统' },
      { no: 4, title: '脚本系统与热更新' },
      { no: 5, title: '编辑器与工具链' },
      { no: 6, title: '完整项目：一个小型引擎' }
    ]
  },
  ...([
    { i: 1, slug: 'exp-python-libs', t: 'Python 主流库与对应应用', p: 135, n: 7 },
    { i: 2, slug: 'exp-python-crawler', t: 'Python 爬虫的热门探讨', p: 145, n: 5 },
    { i: 3, slug: 'exp-python-frontend', t: 'Python 前端开发系列', p: 95, n: 5 },
    { i: 4, slug: 'exp-python-backend', t: 'Python 后端开发的庞大量内容', p: 265, n: 5 },
    { i: 5, slug: 'exp-python-web', t: 'Python 在 Web 领域的问题与内容', p: 119, n: 3 },
    { i: 6, slug: 'exp-python-app', t: 'Python 在 Application 开发领域的内容', p: 129, n: 3 },
    { i: 7, slug: 'exp-python-ai', t: 'Python 在 AI (Artificial Intelligence) 中的应用', p: 175, n: 2 },
    { i: 8, slug: 'exp-python-ai-advanced', t: 'Python 带 AI 的高阶应用', p: 255, n: 2 }
  ] as const).map(({ i, slug, t, p, n }) => ({
    slug,
    category: 'exploration' as const,
    index: i,
    title: t,
    price: p,
    unit: `${n} 期`,
    issuesTotal: n,
    wordsPerIssue: i <= 4 ? '每期正文 8000 至 15000 汉字' : '每期正文 10000 至 15000 汉字，含补丁',
    maintenance: '持续维护',
    updating: '按期刊计划更新',
    perks: [
      '高阶学者向，初学者慎入',
      '可加入 QQ 群或微信群学术交流（任选一个）',
      i >= 7 ? '每期附 1 至 3 个补丁' : '按期刊连载',
      '最低需购入 3 个子项目，总期刊包 1159 元'
    ],
    materialsIncluded: false,
    lang: '中文',
    audience: '高阶学者',
    description: `探索式期刊子项目「${t}」，以专题连载形式深入该领域的关键问题与实践。`,
    toc: Array.from({ length: n }, (_, k) => ({ no: k + 1, title: `第 ${k + 1} 期（连载中）` }))
  }))
];

export const EXPLORATION_BUNDLE_PRICE = 1159;
export const EXPLORATION_BUNDLE_SLUG = 'exploration-bundle';
export const EXPLORATION_BUNDLE_TITLE = '探索式项目总期刊包（全部 8 个子项目）';
export const EXPLORATION_BUNDLE_ORIGINAL = 1318;
export const EXPLORATION_MIN_ITEMS = 3;

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function byCategory(category: Product['category']): Product[] {
  return PRODUCTS.filter((p) => p.category === category).sort((a, b) => a.index - b.index);
}

export function purchaseTitle(slug: string): string {
  if (slug === EXPLORATION_BUNDLE_SLUG) return EXPLORATION_BUNDLE_TITLE;
  return getProduct(slug)?.title || slug;
}

export function minimumWords(product: Product): number {
  if (product.category === 'specialized') return 10000;
  if (product.category === 'exploration') return product.index <= 4 ? 8000 : 10000;
  return 8000;
}
