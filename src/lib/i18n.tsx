import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru';

export const LANGS: { code: Lang; name: string; native: string }[] = [
  { code: 'zh-CN', name: '简体中文', native: '简体中文' },
  { code: 'zh-TW', name: '繁體中文', native: '繁體中文' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ja', name: '日语', native: '日本語' },
  { code: 'ko', name: '韩语', native: '한국어' },
  { code: 'fr', name: '法语', native: 'Français' },
  { code: 'de', name: '德语', native: 'Deutsch' },
  { code: 'es', name: '西班牙语', native: 'Español' },
  { code: 'ru', name: '俄语', native: 'Русский' }
];

type Dict = Record<string, string>;

const zhCN: Dict = {
  'nav.home': '首页',
  'nav.subscription': '订阅式项目',
  'nav.specialized': '专研式项目',
  'nav.exploration': '探索式项目',
  'nav.assessment': '免费评估',
  'nav.products': '全部产品',
  'nav.more': '全部导航',
  'nav.groupProducts': '内容门类',
  'nav.groupLearn': '学习工具',
  'nav.groupCommunity': '社区与动态',
  'nav.groupAccount': '我的账户',
  'nav.surveys': '问卷中心',
  'nav.forum': '讨论区',
  'nav.community': '学术社群',
  'nav.announcements': '公告',
  'nav.search': '搜索',
  'nav.login': '登录',
  'nav.register': '注册',
  'nav.logout': '退出',
  'nav.account': '用户中心',
  'nav.admin': '管理端',
  'nav.demo': '演示模式',
  'footer.categories': '内容门类',
  'footer.legal': '协议与声明',
  'footer.features': '站内功能',
  'footer.contact': '联系与举报',
  'footer.rights': '保留所有权利',
  'footer.assessment': '免费能力评估',
  'footer.terms': '用户服务协议',
  'footer.purchase': '数字内容购买协议',
  'footer.privacy': '隐私政策',
  'footer.antifraud': '举报与反假冒声明',
  'footer.maintenance': '维护与更新政策',
  'footer.community': '学术交流社群',
  'footer.announcements': '平台公告',
  'footer.search': '全站搜索',
  'footer.benefits': '累计支持回馈',
  'theme.system': '跟随系统',
  'theme.light': '浅色模式',
  'theme.dark': '深色模式',
  'lang.label': '界面语言',
  'hero.badge': 'Study and Explore of Coding · 编程研究与探索有限公司出品',
  'hero.title': '编程研究与探索',
  'hero.line1': 'AI for everyone, coding for everyone.',
  'hero.line2': '研究的态度写教程，工程的标准做内容。',
  'hero.line3': 'SEOC Studio，以 R 之名出品。',
  'hero.body': '我们把每一门编程语言当作值得认真对待的研究对象。起源要考据，语法要透彻，教程要成体系，期刊要有补丁意识。三大门类、二十个项目与子项目，为不同阶段的学习者提供从入门到高阶的完整路径。',
  'hero.cta1': '免费注册，解锁试读',
  'hero.cta2': '浏览全部内容',
  'hero.note': '注册后可试读各项目节选，开通后解锁对应全部正文与附赠资料。',
  'hero.stat1': '内容门类',
  'hero.stat2': '在售项目与子项目',
  'hero.stat3': '计划连载期次',
  'home.collections': '三大门类，三种读法',
  'home.viewAll': '查看全部项目',
  'home.howItWorks': '从评估到研读，四步走',
  'home.benefits': '累计支持回馈，全部是实质交付',
  'home.myBenefits': '查看我的回馈',
  'home.latestAnn': '最新公告',
  'home.allAnn': '全部公告',
  'home.promises': '我们的三条硬承诺',
  'home.readLegal': '阅读全部协议与声明',
  'home.faq': '常被问到的问题',
  'home.ctaTitle': '准备好开始研究了吗',
  'home.ctaRegister': '免费注册',
  'home.ctaAssess': '先做能力评估',
  'reader.prev': '上一期',
  'reader.next': '下一期',
  'reader.backToToc': '返回目录',
  'reader.focus': '专注模式',
  'reader.exitFocus': '退出专注模式',
  'reader.quiz': '快问快答',
  'reader.highlight': '标记重点',
  'reader.myMarks': '我的划重点',
  'reader.readingTime': '本次已研读',
  'reader.minutes': '分钟',
  'common.loading': '正在载入',
  'common.loginFirst': '请先登录',
  'products.pageTitle': '全部项目',
  'products.enter': '进入门类',
  'detail.catalog': '完整目录',
  'detail.buyNow': '立即购买',
  'detail.owned': '已开通',
  'detail.pending': '核对中',
  'detail.perks': '权益与说明',
  'auth.email': '邮箱',
  'auth.password': '密码',
  'auth.code': '验证码',
  'auth.sendCode': '发送验证码',
  'auth.login': '登录',
  'auth.register': '注册',
  'auth.reset': '重置密码',
  'auth.forgot': '忘记密码',
  'auth.noAccount': '还没有账户',
  'auth.hasAccount': '已有账户',
  'assess.title': '免费能力评估',
  'assess.start': '开始评估',
  'assess.history': '历史记录',
  'account.title': '用户中心',
  'account.purchases': '已开通内容',
  'account.pending': '待确认申请',
  'account.benefits': '累计支持回馈',
  'common.back': '返回',
  'common.submit': '提交',
  'common.all': '全部',
  'common.view': '查看',

  'nav.ai': '研智助手',

  'nav.groupAI': 'AI 平台',

  'nav.aiCredits': '研点管理',

  'nav.aiApi': 'API 平台',

  'ai.chat.title': '研智助手',

  'ai.chat.subtitle': 'SEOC Studio 智能编程助手',

  'ai.chat.welcome': '你好，我是研智助手',

  'ai.chat.welcomeDesc': '选择一个模型，输入你的编程问题，我会尽力为你解答。所有回复按研点计费，部分模型每日有免费额度。',

  'ai.chat.placeholder': '输入你的问题，Shift+Enter 换行',

  'ai.chat.send': '发送',

  'ai.chat.model': '选择模型',

  'ai.chat.balance': '研点余额',

  'ai.chat.freeRemaining': '今日免费剩余',

  'ai.chat.freeUsed': '免费',

  'ai.chat.tokenCost': '本次消耗',

  'ai.chat.interrupted': '余额不足，回复已中断',

  'ai.chat.noBalance': '研点不足，无法发送',

  'ai.chat.footerNote': '按 Enter 发送，Shift+Enter 换行。',

  'ai.chat.suggest1': 'Python 装饰器怎么用？',

  'ai.chat.suggest2': '解释一下 JavaScript 闭包',

  'ai.chat.suggest3': '如何优化 SQL 查询性能？',

  'ai.credits.title': '研点管理',

  'ai.credits.subtitle': '管理你的研点余额、充值与使用明细',

  'ai.credits.name': '研点',

  'ai.credits.balance': '当前余额',

  'ai.credits.perDay': '次 / 每日',

  'ai.credits.totalSpent': '累计消耗',

  'ai.credits.topup': '充值研点',

  'ai.credits.selectPlan': '选择充值方案',

  'ai.credits.topupNote': '充值后研点即时到账，数字商品一经支付概不退款。',

  'ai.credits.history': '交易流水',

  'ai.credits.usageDetail': '使用明细',

  'ai.credits.noTransactions': '暂无交易记录',

  'ai.credits.noUsage': '暂无使用记录',

  'ai.credits.time': '时间',

  'ai.credits.type': '类型',

  'ai.credits.amount': '变动',

  'ai.credits.note': '备注',

  'ai.credits.model': '模型',

  'ai.credits.cost': '消耗',

  'ai.credits.status': '状态',

  'ai.credits.completed': '完成',

  'ai.credits.provider': '厂商',

  'ai.credits.typePurchase': '充值',

  'ai.credits.typeConsumption': '消费',

  'ai.credits.typeFreeGrant': '免费额度',

  'ai.credits.typeRefund': '退款',

  'ai.credits.typeAdjust': '管理员调整',

  'ai.api.title': 'API 开放平台',

  'ai.api.subtitle': '通过 OpenAI 兼容接口调用 AI 模型，研点计费',

  'ai.api.createKey': '创建 API 密钥',

  'ai.api.keyNamePlaceholder': '为密钥起个名字',

  'ai.api.create': '创建',

  'ai.api.keyCreatedWarning': '请立即复制此密钥，关闭后将无法再次查看。',

  'ai.api.copy': '复制',

  'ai.api.copied': '已复制',

  'ai.api.myKeys': '我的密钥',

  'ai.api.noKeys': '暂无 API 密钥',

  'ai.api.keyName': '名称',

  'ai.api.keyPreview': '密钥',

  'ai.api.lastUsed': '最后使用',

  'ai.api.createdAt': '创建时间',

  'ai.api.revoke': '撤销',

  'ai.api.revokeConfirm': '确认撤销此密钥？撤销后使用该密钥的调用将立即失效。',

  'ai.api.docs': 'API 文档',

  'ai.api.showDocs': '展开文档',

  'ai.api.hideDocs': '收起文档',

  'ai.api.endpoint': '端点地址',

  'ai.api.auth': '认证方式',

  'ai.api.authDesc': '在请求头中传入 Bearer Token 进行认证。',

  'ai.api.example': '调用示例',

  'ai.api.availableModels': '可用模型',

  'ai.api.compatibility': '兼容性说明',

  'ai.api.compat1': '完全兼容 OpenAI Chat Completions API 格式',

  'ai.api.compat2': '支持流式（stream: true）和非流式两种模式',

  'ai.api.compat3': '可使用 openai-python、openai-node 等官方 SDK 直接对接',

  'common.action': '操作',
};

const zhTW: Dict = {
  'nav.home': '首頁',
  'nav.subscription': '訂閱式項目',
  'nav.specialized': '專研式項目',
  'nav.exploration': '探索式項目',
  'nav.assessment': '免費評估',
  'nav.products': '全部產品',
  'nav.more': '全部導航',
  'nav.groupProducts': '內容門類',
  'nav.groupLearn': '學習工具',
  'nav.groupCommunity': '社群與動態',
  'nav.groupAccount': '我的帳戶',
  'nav.surveys': '問卷中心',
  'nav.forum': '討論區',
  'nav.community': '學術社群',
  'nav.announcements': '公告',
  'nav.search': '搜尋',
  'nav.login': '登入',
  'nav.register': '註冊',
  'nav.logout': '登出',
  'nav.account': '會員中心',
  'nav.admin': '管理端',
  'nav.demo': '演示模式',
  'footer.categories': '內容門類',
  'footer.legal': '協議與聲明',
  'footer.features': '站內功能',
  'footer.contact': '聯絡與舉報',
  'footer.rights': '保留所有權利',
  'footer.assessment': '免費能力評估',
  'footer.terms': '使用者服務協議',
  'footer.purchase': '數位內容購買協議',
  'footer.privacy': '隱私政策',
  'footer.antifraud': '舉報與反假冒聲明',
  'footer.maintenance': '維護與更新政策',
  'footer.community': '學術交流社群',
  'footer.announcements': '平台公告',
  'footer.search': '全站搜尋',
  'footer.benefits': '累計支持回饋',
  'theme.system': '跟隨系統',
  'theme.light': '淺色模式',
  'theme.dark': '深色模式',
  'lang.label': '介面語言',
  'hero.badge': 'Study and Explore of Coding · 編程研究與探索有限公司出品',
  'hero.title': '編程研究與探索',
  'hero.line1': 'AI for everyone, coding for everyone.',
  'hero.line2': '研究的態度寫教學，工程的標準做內容。',
  'hero.line3': 'SEOC Studio，以 R 之名出品。',
  'hero.body': '我們把每一門程式語言當作值得認真對待的研究對象。起源要考據，語法要透徹，教學要成體系，期刊要有補丁意識。三大門類、二十個項目與子項目，為不同階段的學習者提供從入門到高階的完整路徑。',
  'hero.cta1': '免費註冊，解鎖試讀',
  'hero.cta2': '瀏覽全部內容',
  'hero.note': '註冊後可試讀各項目節選，開通後解鎖對應全部正文與附贈資料。',
  'hero.stat1': '內容門類',
  'hero.stat2': '在售項目與子項目',
  'hero.stat3': '計畫連載期次',
  'home.collections': '三大門類，三種讀法',
  'home.viewAll': '查看全部項目',
  'home.howItWorks': '從評估到研讀，四步走',
  'home.benefits': '累計支持回饋，全部是實質交付',
  'home.myBenefits': '查看我的回饋',
  'home.latestAnn': '最新公告',
  'home.allAnn': '全部公告',
  'home.promises': '我們的三條硬承諾',
  'home.readLegal': '閱讀全部協議與聲明',
  'home.faq': '常被問到的問題',
  'home.ctaTitle': '準備好開始研究了嗎',
  'home.ctaRegister': '免費註冊',
  'home.ctaAssess': '先做能力評估',
  'reader.prev': '上一期',
  'reader.next': '下一期',
  'reader.backToToc': '返回目錄',
  'reader.focus': '專注模式',
  'reader.exitFocus': '退出專注模式',
  'reader.quiz': '快問快答',
  'reader.highlight': '標記重點',
  'reader.myMarks': '我的劃重點',
  'reader.readingTime': '本次已研讀',
  'reader.minutes': '分鐘',
  'common.loading': '正在載入',
  'common.loginFirst': '請先登入',
  'products.pageTitle': '全部項目',
  'products.enter': '進入門類',
  'detail.catalog': '完整目錄',
  'detail.buyNow': '立即購買',
  'detail.owned': '已開通',
  'detail.pending': '核對中',
  'detail.perks': '權益與說明',
  'auth.email': '電子郵箱',
  'auth.password': '密碼',
  'auth.code': '驗證碼',
  'auth.sendCode': '發送驗證碼',
  'auth.login': '登入',
  'auth.register': '註冊',
  'auth.reset': '重設密碼',
  'auth.forgot': '忘記密碼',
  'auth.noAccount': '還沒有帳戶',
  'auth.hasAccount': '已有帳戶',
  'assess.title': '免費能力評估',
  'assess.start': '開始評估',
  'assess.history': '歷史記錄',
  'account.title': '會員中心',
  'account.purchases': '已開通內容',
  'account.pending': '待確認申請',
  'account.benefits': '累計支持回饋',
  'common.back': '返回',
  'common.submit': '提交',
  'common.all': '全部',
  'common.view': '查看',

  'nav.ai': '研智助手',

  'nav.groupAI': 'AI 平台',

  'nav.aiCredits': '研點管理',

  'nav.aiApi': 'API 平台',

  'ai.chat.title': '研智助手',

  'ai.chat.subtitle': 'SEOC Studio 智能編程助手',

  'ai.chat.welcome': '你好，我是研智助手',

  'ai.chat.welcomeDesc': '選擇一個模型，輸入你的編程問題，我會盡力為你解答。所有回覆按研點計費，部分模型每日有免費額度。',

  'ai.chat.placeholder': '輸入你的問題，Shift+Enter 換行',

  'ai.chat.send': '發送',

  'ai.chat.model': '選擇模型',

  'ai.chat.balance': '研點餘額',

  'ai.chat.freeRemaining': '今日免費剩餘',

  'ai.chat.freeUsed': '免費',

  'ai.chat.tokenCost': '本次消耗',

  'ai.chat.interrupted': '餘額不足，回覆已中斷',

  'ai.chat.noBalance': '研點不足，無法發送',

  'ai.chat.footerNote': '按 Enter 發送，Shift+Enter 換行。',

  'ai.chat.suggest1': 'Python 裝飾器怎麼用？',

  'ai.chat.suggest2': '解釋一下 JavaScript 閉包',

  'ai.chat.suggest3': '如何優化 SQL 查詢性能？',

  'ai.credits.title': '研點管理',

  'ai.credits.subtitle': '管理你的研點餘額、充值與使用明細',

  'ai.credits.name': '研點',

  'ai.credits.balance': '當前餘額',

  'ai.credits.perDay': '次 / 每日',

  'ai.credits.totalSpent': '累計消耗',

  'ai.credits.topup': '充值研點',

  'ai.credits.selectPlan': '選擇充值方案',

  'ai.credits.topupNote': '充值後研點即時到賬，數位商品一經支付概不退款。',

  'ai.credits.history': '交易流水',

  'ai.credits.usageDetail': '使用明細',

  'ai.credits.noTransactions': '暫無交易記錄',

  'ai.credits.noUsage': '暫無使用記錄',

  'ai.credits.time': '時間',

  'ai.credits.type': '類型',

  'ai.credits.amount': '變動',

  'ai.credits.note': '備註',

  'ai.credits.model': '模型',

  'ai.credits.cost': '消耗',

  'ai.credits.status': '狀態',

  'ai.credits.completed': '完成',

  'ai.credits.provider': '廠商',

  'ai.credits.typePurchase': '充值',

  'ai.credits.typeConsumption': '消費',

  'ai.credits.typeFreeGrant': '免費額度',

  'ai.credits.typeRefund': '退款',

  'ai.credits.typeAdjust': '管理員調整',

  'ai.api.title': 'API 開放平台',

  'ai.api.subtitle': '透過 OpenAI 相容介面呼叫 AI 模型，研點計費',

  'ai.api.createKey': '建立 API 金鑰',

  'ai.api.keyNamePlaceholder': '為金鑰取個名字',

  'ai.api.create': '建立',

  'ai.api.keyCreatedWarning': '請立即複製此金鑰，關閉後將無法再次查看。',

  'ai.api.copy': '複製',

  'ai.api.copied': '已複製',

  'ai.api.myKeys': '我的金鑰',

  'ai.api.noKeys': '暫無 API 金鑰',

  'ai.api.keyName': '名稱',

  'ai.api.keyPreview': '金鑰',

  'ai.api.lastUsed': '最後使用',

  'ai.api.createdAt': '建立時間',

  'ai.api.revoke': '撤銷',

  'ai.api.revokeConfirm': '確認撤銷此金鑰？撤銷後使用該金鑰的呼叫將立即失效。',

  'ai.api.docs': 'API 文件',

  'ai.api.showDocs': '展開文件',

  'ai.api.hideDocs': '收起文件',

  'ai.api.endpoint': '端點位址',

  'ai.api.auth': '認證方式',

  'ai.api.authDesc': '在請求標頭中傳入 Bearer Token 進行認證。',

  'ai.api.example': '呼叫範例',

  'ai.api.availableModels': '可用模型',

  'ai.api.compatibility': '相容性說明',

  'ai.api.compat1': '完全相容 OpenAI Chat Completions API 格式',

  'ai.api.compat2': '支援串流（stream: true）和非串流兩種模式',

  'ai.api.compat3': '可使用 openai-python、openai-node 等官方 SDK 直接對接',

  'common.action': '操作',
};

const en: Dict = {
  'nav.home': 'Home',
  'nav.subscription': 'Subscriptions',
  'nav.specialized': 'Series',
  'nav.exploration': 'Journals',
  'nav.assessment': 'Free Assessment',
  'nav.products': 'All Products',
  'nav.more': 'All Navigation',
  'nav.groupProducts': 'Collections',
  'nav.groupLearn': 'Study Tools',
  'nav.groupCommunity': 'Community',
  'nav.groupAccount': 'My Account',
  'nav.surveys': 'Surveys',
  'nav.forum': 'Forum',
  'nav.community': 'Community',
  'nav.announcements': 'News',
  'nav.search': 'Search',
  'nav.login': 'Sign in',
  'nav.register': 'Sign up',
  'nav.logout': 'Sign out',
  'nav.account': 'Account',
  'nav.admin': 'Admin',
  'nav.demo': 'Demo mode',
  'footer.categories': 'Collections',
  'footer.legal': 'Legal',
  'footer.features': 'Features',
  'footer.contact': 'Contact & Reports',
  'footer.rights': 'All rights reserved',
  'footer.assessment': 'Free skill assessment',
  'footer.terms': 'Terms of Service',
  'footer.purchase': 'Purchase Agreement',
  'footer.privacy': 'Privacy Policy',
  'footer.antifraud': 'Anti-fraud Notice',
  'footer.maintenance': 'Maintenance Policy',
  'footer.community': 'Academic community',
  'footer.announcements': 'Announcements',
  'footer.search': 'Site search',
  'footer.benefits': 'Reader benefits',
  'theme.system': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'lang.label': 'Language',
  'hero.badge': 'Study and Explore of Coding',
  'hero.title': 'Study and Explore of Coding',
  'hero.line1': 'AI for everyone, coding for everyone.',
  'hero.line2': 'Tutorials with research rigor, content with engineering standards.',
  'hero.line3': 'SEOC Studio, signed with an R.',
  'hero.body': 'We treat every programming language as a subject worth serious study. Origins are researched, syntax is thorough, tutorials are systematic, and journals come with patches. Three collections and twenty projects guide learners from beginner to advanced.',
  'hero.cta1': 'Sign up free, unlock previews',
  'hero.cta2': 'Browse all content',
  'hero.note': 'Registered users can preview excerpts; full texts and bonus materials unlock after purchase.',
  'hero.stat1': 'Collections',
  'hero.stat2': 'Projects on sale',
  'hero.stat3': 'Planned issues',
  'home.collections': 'Three collections, three ways to read',
  'home.viewAll': 'View all projects',
  'home.howItWorks': 'From assessment to mastery in four steps',
  'home.benefits': 'Reader benefits, all real deliverables',
  'home.myBenefits': 'My benefits',
  'home.latestAnn': 'Latest announcements',
  'home.allAnn': 'All announcements',
  'home.promises': 'Our three firm promises',
  'home.readLegal': 'Read all terms and policies',
  'home.faq': 'Frequently asked questions',
  'home.ctaTitle': 'Ready to start exploring?',
  'home.ctaRegister': 'Sign up free',
  'home.ctaAssess': 'Take the assessment',
  'reader.prev': 'Previous',
  'reader.next': 'Next',
  'reader.backToToc': 'Back to contents',
  'reader.focus': 'Focus mode',
  'reader.exitFocus': 'Exit focus',
  'reader.quiz': 'Quick quiz',
  'reader.highlight': 'Highlight',
  'reader.myMarks': 'My highlights',
  'reader.readingTime': 'Reading time',
  'reader.minutes': 'min',
  'common.loading': 'Loading',
  'common.loginFirst': 'Please sign in first',
  'products.pageTitle': 'All projects',
  'products.enter': 'Enter collection',
  'detail.catalog': 'Full contents',
  'detail.buyNow': 'Buy now',
  'detail.owned': 'Activated',
  'detail.pending': 'Under review',
  'detail.perks': 'Perks & notes',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.code': 'Code',
  'auth.sendCode': 'Send code',
  'auth.login': 'Sign in',
  'auth.register': 'Sign up',
  'auth.reset': 'Reset password',
  'auth.forgot': 'Forgot password',
  'auth.noAccount': 'No account yet',
  'auth.hasAccount': 'Already have an account',
  'assess.title': 'Free skill assessment',
  'assess.start': 'Start assessment',
  'assess.history': 'History',
  'account.title': 'Account',
  'account.purchases': 'Activated content',
  'account.pending': 'Pending requests',
  'account.benefits': 'Reader benefits',
  'common.back': 'Back',
  'common.submit': 'Submit',
  'common.all': 'All',
  'common.view': 'View',

  'nav.ai': 'AI Assistant',

  'nav.groupAI': 'AI Platform',

  'nav.aiCredits': 'Credits',

  'nav.aiApi': 'API Platform',

  'ai.chat.title': 'SEOC AI Assistant',

  'ai.chat.subtitle': 'SEOC Studio Intelligent Coding Assistant',

  'ai.chat.welcome': 'Hello, I\'m your AI Assistant',

  'ai.chat.welcomeDesc': 'Select a model and ask your coding questions. All replies are billed in Research Points; some models include a daily free quota.',

  'ai.chat.placeholder': 'Type your question, Shift+Enter for new line',

  'ai.chat.send': 'Send',

  'ai.chat.model': 'Select model',

  'ai.chat.balance': 'Balance',

  'ai.chat.freeRemaining': 'Free remaining today',

  'ai.chat.freeUsed': 'Free',

  'ai.chat.tokenCost': 'This message cost',

  'ai.chat.interrupted': 'Insufficient balance, reply interrupted',

  'ai.chat.noBalance': 'Insufficient Research Points to send',

  'ai.chat.footerNote': 'Press Enter to send, Shift+Enter for new line.',

  'ai.chat.suggest1': 'How to use Python decorators?',

  'ai.chat.suggest2': 'Explain JavaScript closures',

  'ai.chat.suggest3': 'How to optimize SQL query performance?',

  'ai.credits.title': 'Research Points',

  'ai.credits.subtitle': 'Manage your balance, top-ups and usage details',

  'ai.credits.name': 'Research Points',

  'ai.credits.balance': 'Current balance',

  'ai.credits.perDay': 'per day',

  'ai.credits.totalSpent': 'Total spent',

  'ai.credits.topup': 'Top up',

  'ai.credits.selectPlan': 'Select a top-up plan',

  'ai.credits.topupNote': 'Points are credited instantly. Digital goods are non-refundable once paid.',

  'ai.credits.history': 'Transaction history',

  'ai.credits.usageDetail': 'Usage details',

  'ai.credits.noTransactions': 'No transactions yet',

  'ai.credits.noUsage': 'No usage records yet',

  'ai.credits.time': 'Time',

  'ai.credits.type': 'Type',

  'ai.credits.amount': 'Change',

  'ai.credits.note': 'Note',

  'ai.credits.model': 'Model',

  'ai.credits.cost': 'Cost',

  'ai.credits.status': 'Status',

  'ai.credits.completed': 'Completed',

  'ai.credits.provider': 'Provider',

  'ai.credits.typePurchase': 'Top-up',

  'ai.credits.typeConsumption': 'Consumption',

  'ai.credits.typeFreeGrant': 'Free quota',

  'ai.credits.typeRefund': 'Refund',

  'ai.credits.typeAdjust': 'Admin adjustment',

  'ai.api.title': 'API Platform',

  'ai.api.subtitle': 'Call AI models via OpenAI-compatible endpoints, billed in Research Points',

  'ai.api.createKey': 'Create API key',

  'ai.api.keyNamePlaceholder': 'Give your key a name',

  'ai.api.create': 'Create',

  'ai.api.keyCreatedWarning': 'Copy this key now. It won\'t be shown again after you close this.',

  'ai.api.copy': 'Copy',

  'ai.api.copied': 'Copied',

  'ai.api.myKeys': 'My keys',

  'ai.api.noKeys': 'No API keys yet',

  'ai.api.keyName': 'Name',

  'ai.api.keyPreview': 'Key',

  'ai.api.lastUsed': 'Last used',

  'ai.api.createdAt': 'Created',

  'ai.api.revoke': 'Revoke',

  'ai.api.revokeConfirm': 'Revoke this key? Calls using it will fail immediately.',

  'ai.api.docs': 'API Documentation',

  'ai.api.showDocs': 'Show docs',

  'ai.api.hideDocs': 'Hide docs',

  'ai.api.endpoint': 'Endpoint URL',

  'ai.api.auth': 'Authentication',

  'ai.api.authDesc': 'Pass a Bearer Token in the Authorization header to authenticate.',

  'ai.api.example': 'Example',

  'ai.api.availableModels': 'Available models',

  'ai.api.compatibility': 'Compatibility notes',

  'ai.api.compat1': 'Fully compatible with the OpenAI Chat Completions API format',

  'ai.api.compat2': 'Supports both streaming (stream: true) and non-streaming modes',

  'ai.api.compat3': 'Works directly with official SDKs such as openai-python and openai-node',

  'common.action': 'Action',
};

const ja: Dict = {
  'nav.home': 'ホーム',
  'nav.subscription': '購読プロジェクト',
  'nav.specialized': '専研プロジェクト',
  'nav.exploration': '探索プロジェクト',
  'nav.assessment': '無料評価',
  'nav.products': 'すべての製品',
  'nav.more': '全ナビゲーション',
  'nav.groupProducts': 'コンテンツ',
  'nav.groupLearn': '学習ツール',
  'nav.groupCommunity': 'コミュニティ',
  'nav.groupAccount': 'マイアカウント',
  'nav.surveys': 'アンケート',
  'nav.forum': 'フォーラム',
  'nav.community': '学術コミュニティ',
  'nav.announcements': 'お知らせ',
  'nav.search': '検索',
  'nav.login': 'ログイン',
  'nav.register': '登録',
  'nav.logout': 'ログアウト',
  'nav.account': 'マイページ',
  'nav.admin': '管理',
  'nav.demo': 'デモモード',
  'footer.categories': 'コンテンツ分類',
  'footer.legal': '規約と声明',
  'footer.features': 'サイト機能',
  'footer.contact': '連絡と通報',
  'footer.rights': '全著作権所有',
  'footer.assessment': '無料能力評価',
  'footer.terms': '利用規約',
  'footer.purchase': 'デジタルコンテンツ購入契約',
  'footer.privacy': 'プライバシーポリシー',
  'footer.antifraud': '通報と偽造防止声明',
  'footer.maintenance': '保守・更新ポリシー',
  'footer.community': '学術交流コミュニティ',
  'footer.announcements': 'お知らせ一覧',
  'footer.search': 'サイト内検索',
  'footer.benefits': '累計支援特典',
  'theme.system': 'システムに従う',
  'theme.light': 'ライトモード',
  'theme.dark': 'ダークモード',
  'lang.label': '表示言語',
  'hero.badge': 'Study and Explore of Coding',
  'hero.title': 'プログラミング研究と探索',
  'hero.line1': 'AI for everyone, coding for everyone.',
  'hero.line2': '研究の姿勢でチュートリアルを、工学の基準でコンテンツを。',
  'hero.line3': 'SEOC Studio、R の名のもとに。',
  'hero.body': '私たちはすべてのプログラミング言語を真剣に研究する対象として扱います。起源の考証、徹底した文法、体系化されたチュートリアル、パッチ意識のあるジャーナル。3つの分類と20のプロジェクトで、初心者から上級者までの道筋を提供します。',
  'hero.cta1': '無料登録して試し読み',
  'hero.cta2': 'すべてのコンテンツを見る',
  'hero.note': '登録後に各プロジェクトの抜粋を試し読みできます。開通後は全文と特典資料が解放されます。',
  'hero.stat1': 'コンテンツ分類',
  'hero.stat2': '販売中のプロジェクト',
  'hero.stat3': '連載予定号数',
  'home.collections': '3つの分類、3つの読み方',
  'home.viewAll': 'すべてのプロジェクトを見る',
  'home.howItWorks': '評価から熟読まで、4つのステップ',
  'home.benefits': '累計支援特典、すべて実質的な交付',
  'home.myBenefits': '私の特典を見る',
  'home.latestAnn': '最新のお知らせ',
  'home.allAnn': 'すべてのお知らせ',
  'home.promises': '3つの確かな約束',
  'home.readLegal': 'すべての規約と声明を読む',
  'home.faq': 'よくある質問',
  'home.ctaTitle': '研究を始める準備はできましたか',
  'home.ctaRegister': '無料登録',
  'home.ctaAssess': 'まず能力評価を',
  'reader.prev': '前の号',
  'reader.next': '次の号',
  'reader.backToToc': '目次に戻る',
  'reader.focus': '集中モード',
  'reader.exitFocus': '集中モード解除',
  'reader.quiz': 'クイッククイズ',
  'reader.highlight': 'ハイライト',
  'reader.myMarks': 'マイハイライト',
  'reader.readingTime': '読書時間',
  'reader.minutes': '分',
  'common.loading': '読み込み中',
  'common.loginFirst': '先にログインしてください',
  'products.pageTitle': 'すべてのプロジェクト',
  'products.enter': '分類に入る',
  'detail.catalog': '完全な目次',
  'detail.buyNow': '今すぐ購入',
  'detail.owned': '開通済み',
  'detail.pending': '確認中',
  'detail.perks': '特典と説明',
  'auth.email': 'メール',
  'auth.password': 'パスワード',
  'auth.code': '認証コード',
  'auth.sendCode': 'コードを送信',
  'auth.login': 'ログイン',
  'auth.register': '登録',
  'auth.reset': 'パスワード再設定',
  'auth.forgot': 'パスワードを忘れた',
  'auth.noAccount': 'アカウント未作成',
  'auth.hasAccount': '既にアカウントをお持ちの方',
  'assess.title': '無料能力評価',
  'assess.start': '評価を開始',
  'assess.history': '履歴',
  'account.title': 'マイページ',
  'account.purchases': '開通済みコンテンツ',
  'account.pending': '確認待ち申請',
  'account.benefits': '累計支援特典',
  'common.back': '戻る',
  'common.submit': '送信',
  'common.all': 'すべて',
  'common.view': '表示',

  'nav.ai': 'AIアシスタント',

  'nav.groupAI': 'AIプラットフォーム',

  'nav.aiCredits': 'ポイント管理',

  'nav.aiApi': 'APIプラットフォーム',

  'ai.chat.title': 'SEOC AIアシスタント',

  'ai.chat.subtitle': 'SEOC Studio インテリジェントコーディングアシスタント',

  'ai.chat.welcome': 'こんにちは、AIアシスタントです',

  'ai.chat.welcomeDesc': 'モデルを選択し、プログラミングの質問を入力してください。すべての返信はポイントで課金されますが、一部のモデルには無料枠があります。',

  'ai.chat.placeholder': '質問を入力、Shift+Enter で改行',

  'ai.chat.send': '送信',

  'ai.chat.model': 'モデルを選択',

  'ai.chat.balance': 'ポイント残高',

  'ai.chat.freeRemaining': '本日の無料残り',

  'ai.chat.freeUsed': '無料',

  'ai.chat.tokenCost': '今回の消費',

  'ai.chat.interrupted': '残高不足のため返信が中断されました',

  'ai.chat.noBalance': 'ポイント不足のため送信できません',

  'ai.chat.footerNote': 'Enter で送信、Shift+Enter で改行。',

  'ai.chat.suggest1': 'Python デコレータの使い方は？',

  'ai.chat.suggest2': 'JavaScript クロージャを説明して',

  'ai.chat.suggest3': 'SQL クエリのパフォーマンスを最適化するには？',

  'ai.credits.title': 'ポイント管理',

  'ai.credits.subtitle': 'ポイント残高、チャージ、使用明細を管理',

  'ai.credits.name': 'ポイント',

  'ai.credits.balance': '現在の残高',

  'ai.credits.perDay': '回 / 毎日',

  'ai.credits.totalSpent': '累計消費',

  'ai.credits.topup': 'チャージ',

  'ai.credits.selectPlan': 'チャージプランを選択',

  'ai.credits.topupNote': 'チャージ後ポイントは即時反映されます。デジタル商品は支払い後の返金はできません。',

  'ai.credits.history': '取引履歴',

  'ai.credits.usageDetail': '使用明細',

  'ai.credits.noTransactions': '取引記録はありません',

  'ai.credits.noUsage': '使用記録はありません',

  'ai.credits.time': '時間',

  'ai.credits.type': 'タイプ',

  'ai.credits.amount': '変動',

  'ai.credits.note': '備考',

  'ai.credits.model': 'モデル',

  'ai.credits.cost': '消費',

  'ai.credits.status': 'ステータス',

  'ai.credits.completed': '完了',

  'ai.credits.provider': 'プロバイダー',

  'ai.credits.typePurchase': 'チャージ',

  'ai.credits.typeConsumption': '消費',

  'ai.credits.typeFreeGrant': '無料枠',

  'ai.credits.typeRefund': '返金',

  'ai.credits.typeAdjust': '管理者調整',

  'ai.api.title': 'APIプラットフォーム',

  'ai.api.subtitle': 'OpenAI 互換インターフェースで AI モデルを呼び出し、ポイントで課金',

  'ai.api.createKey': 'API キーを作成',

  'ai.api.keyNamePlaceholder': 'キーに名前を付ける',

  'ai.api.create': '作成',

  'ai.api.keyCreatedWarning': 'このキーを今すぐコピーしてください。閉じると再度表示されません。',

  'ai.api.copy': 'コピー',

  'ai.api.copied': 'コピー済み',

  'ai.api.myKeys': 'マイキー',

  'ai.api.noKeys': 'API キーはありません',

  'ai.api.keyName': '名前',

  'ai.api.keyPreview': 'キー',

  'ai.api.lastUsed': '最終使用',

  'ai.api.createdAt': '作成日時',

  'ai.api.revoke': '取り消し',

  'ai.api.revokeConfirm': 'このキーを取り消しますか？このキーを使った呼び出しは即座に無効になります。',

  'ai.api.docs': 'API ドキュメント',

  'ai.api.showDocs': 'ドキュメントを表示',

  'ai.api.hideDocs': 'ドキュメントを非表示',

  'ai.api.endpoint': 'エンドポイント URL',

  'ai.api.auth': '認証方法',

  'ai.api.authDesc': 'Authorization ヘッダーに Bearer トークンを渡して認証します。',

  'ai.api.example': '呼び出し例',

  'ai.api.availableModels': '利用可能なモデル',

  'ai.api.compatibility': '互換性の説明',

  'ai.api.compat1': 'OpenAI Chat Completions API 形式と完全互換',

  'ai.api.compat2': 'ストリーミング (stream: true) と非ストリーミングの両モードに対応',

  'ai.api.compat3': 'openai-python、openai-node などの公式 SDK で直接利用可能',

  'common.action': '操作',
};

const ko: Dict = {
  'nav.home': '홈',
  'nav.subscription': '구독 프로젝트',
  'nav.specialized': '전연 프로젝트',
  'nav.exploration': '탐구 프로젝트',
  'nav.assessment': '무료 평가',
  'nav.products': '전체 제품',
  'nav.more': '전체 메뉴',
  'nav.groupProducts': '콘텐츠',
  'nav.groupLearn': '학습 도구',
  'nav.groupCommunity': '커뮤니티',
  'nav.groupAccount': '내 계정',
  'nav.surveys': '설문 센터',
  'nav.forum': '포럼',
  'nav.community': '학술 커뮤니티',
  'nav.announcements': '공지',
  'nav.search': '검색',
  'nav.login': '로그인',
  'nav.register': '가입',
  'nav.logout': '로그아웃',
  'nav.account': '내 계정',
  'nav.admin': '관리자',
  'nav.demo': '데모 모드',
  'footer.categories': '콘텐츠 분류',
  'footer.legal': '약관 및 성명',
  'footer.features': '사이트 기능',
  'footer.contact': '연락 및 신고',
  'footer.rights': '모든 권리 보유',
  'footer.assessment': '무료 능력 평가',
  'footer.terms': '서비스 이용약관',
  'footer.purchase': '디지털 콘텐츠 구매 계약',
  'footer.privacy': '개인정보 처리방침',
  'footer.antifraud': '신고 및 위조 방지 성명',
  'footer.maintenance': '유지보수 및 업데이트 정책',
  'footer.community': '학술 교류 커뮤니티',
  'footer.announcements': '공지사항',
  'footer.search': '사이트 검색',
  'footer.benefits': '누적 후원 혜택',
  'theme.system': '시스템 설정',
  'theme.light': '라이트 모드',
  'theme.dark': '다크 모드',
  'lang.label': '인터페이스 언어',
  'hero.badge': 'Study and Explore of Coding',
  'hero.title': '프로그래밍 연구와 탐구',
  'hero.line1': 'AI for everyone, coding for everyone.',
  'hero.line2': '연구하는 자세로 튜토리얼을, 공학적 기준으로 콘텐츠를.',
  'hero.line3': 'SEOC Studio, R의 이름으로.',
  'hero.body': '우리는 모든 프로그래밍 언어를 진지하게 연구할 대상으로 여깁니다. 기원 고증, 철저한 문법, 체계적인 튜토리얼, 패치가 있는 저널. 세 가지 분류와 스무 개의 프로젝트로 입문부터 고급까지의 완전한 경로를 제공합니다.',
  'hero.cta1': '무료 가입하고 미리 읽기',
  'hero.cta2': '전체 콘텐츠 보기',
  'hero.note': '가입 후 각 프로젝트의 발췌를 미리 읽을 수 있으며, 개통 후 전문과 특전 자료가 열립니다.',
  'hero.stat1': '콘텐츠 분류',
  'hero.stat2': '판매 중인 프로젝트',
  'hero.stat3': '연재 예정 호수',
  'home.collections': '세 가지 분류, 세 가지 읽기',
  'home.viewAll': '전체 프로젝트 보기',
  'home.howItWorks': '평가에서 정독까지, 네 단계',
  'home.benefits': '누적 후원 혜택, 모두 실질적인 제공',
  'home.myBenefits': '내 혜택 보기',
  'home.latestAnn': '최신 공지',
  'home.allAnn': '전체 공지',
  'home.promises': '우리의 세 가지 약속',
  'home.readLegal': '전체 약관 및 성명 읽기',
  'home.faq': '자주 묻는 질문',
  'home.ctaTitle': '연구를 시작할 준비가 되셨나요',
  'home.ctaRegister': '무료 가입',
  'home.ctaAssess': '먼저 능력 평가',
  'reader.prev': '이전 호',
  'reader.next': '다음 호',
  'reader.backToToc': '목차로 돌아가기',
  'reader.focus': '집중 모드',
  'reader.exitFocus': '집중 모드 해제',
  'reader.quiz': '퀵 퀴즈',
  'reader.highlight': '하이라이트',
  'reader.myMarks': '내 하이라이트',
  'reader.readingTime': '읽은 시간',
  'reader.minutes': '분',
  'common.loading': '로딩 중',
  'common.loginFirst': '먼저 로그인하세요',
  'products.pageTitle': '전체 프로젝트',
  'products.enter': '분류 들어가기',
  'detail.catalog': '전체 목차',
  'detail.buyNow': '지금 구매',
  'detail.owned': '개통됨',
  'detail.pending': '확인 중',
  'detail.perks': '혜택 및 안내',
  'auth.email': '이메일',
  'auth.password': '비밀번호',
  'auth.code': '인증 코드',
  'auth.sendCode': '코드 보내기',
  'auth.login': '로그인',
  'auth.register': '가입',
  'auth.reset': '비밀번호 재설정',
  'auth.forgot': '비밀번호 찾기',
  'auth.noAccount': '계정이 없으신가요',
  'auth.hasAccount': '이미 계정이 있으신가요',
  'assess.title': '무료 능력 평가',
  'assess.start': '평가 시작',
  'assess.history': '기록',
  'account.title': '내 계정',
  'account.purchases': '개통된 콘텐츠',
  'account.pending': '확인 대기 신청',
  'account.benefits': '누적 후원 혜택',
  'common.back': '뒤로',
  'common.submit': '제출',
  'common.all': '전체',
  'common.view': '보기',

  'nav.ai': 'AI 어시스턴트',

  'nav.groupAI': 'AI 플랫폼',

  'nav.aiCredits': '포인트 관리',

  'nav.aiApi': 'API 플랫폼',

  'ai.chat.title': 'SEOC AI 어시스턴트',

  'ai.chat.subtitle': 'SEOC Studio 지능형 코딩 어시스턴트',

  'ai.chat.welcome': '안녕하세요, AI 어시스턴트입니다',

  'ai.chat.welcomeDesc': '모델을 선택하고 코딩 질문을 입력하세요. 모든 응답은 포인트로 과금되며, 일부 모델은 매일 무료 할당이 있습니다.',

  'ai.chat.placeholder': '질문을 입력하세요, Shift+Enter로 줄바꿈',

  'ai.chat.send': '보내기',

  'ai.chat.model': '모델 선택',

  'ai.chat.balance': '포인트 잔액',

  'ai.chat.freeRemaining': '오늘 무료 잔여',

  'ai.chat.freeUsed': '무료',

  'ai.chat.tokenCost': '이번 소비',

  'ai.chat.interrupted': '잔액 부족으로 응답이 중단되었습니다',

  'ai.chat.noBalance': '포인트가 부족하여 전송할 수 없습니다',

  'ai.chat.footerNote': 'Enter로 보내기, Shift+Enter로 줄바꿈.',

  'ai.chat.suggest1': 'Python 데코레이터는 어떻게 사용하나요?',

  'ai.chat.suggest2': 'JavaScript 클로저를 설명해주세요',

  'ai.chat.suggest3': 'SQL 쿼리 성능을 어떻게 최적화하나요?',

  'ai.credits.title': '포인트 관리',

  'ai.credits.subtitle': '포인트 잔액, 충전 및 사용 내역 관리',

  'ai.credits.name': '포인트',

  'ai.credits.balance': '현재 잔액',

  'ai.credits.perDay': '회 / 매일',

  'ai.credits.totalSpent': '누적 소비',

  'ai.credits.topup': '충전',

  'ai.credits.selectPlan': '충전 플랜 선택',

  'ai.credits.topupNote': '충전 후 포인트가 즉시 반영됩니다. 디지털 상품은 결제 후 환불이 불가합니다.',

  'ai.credits.history': '거래 내역',

  'ai.credits.usageDetail': '사용 내역',

  'ai.credits.noTransactions': '거래 내역이 없습니다',

  'ai.credits.noUsage': '사용 기록이 없습니다',

  'ai.credits.time': '시간',

  'ai.credits.type': '유형',

  'ai.credits.amount': '변동',

  'ai.credits.note': '비고',

  'ai.credits.model': '모델',

  'ai.credits.cost': '소비',

  'ai.credits.status': '상태',

  'ai.credits.completed': '완료',

  'ai.credits.provider': '제공자',

  'ai.credits.typePurchase': '충전',

  'ai.credits.typeConsumption': '소비',

  'ai.credits.typeFreeGrant': '무료 할당',

  'ai.credits.typeRefund': '환불',

  'ai.credits.typeAdjust': '관리자 조정',

  'ai.api.title': 'API 플랫폼',

  'ai.api.subtitle': 'OpenAI 호환 인터페이스로 AI 모델 호출, 포인트로 과금',

  'ai.api.createKey': 'API 키 생성',

  'ai.api.keyNamePlaceholder': '키 이름 입력',

  'ai.api.create': '생성',

  'ai.api.keyCreatedWarning': '이 키를 지금 복사하세요. 닫으면 다시 볼 수 없습니다.',

  'ai.api.copy': '복사',

  'ai.api.copied': '복사됨',

  'ai.api.myKeys': '내 키',

  'ai.api.noKeys': 'API 키가 없습니다',

  'ai.api.keyName': '이름',

  'ai.api.keyPreview': '키',

  'ai.api.lastUsed': '마지막 사용',

  'ai.api.createdAt': '생성일',

  'ai.api.revoke': '철회',

  'ai.api.revokeConfirm': '이 키를 철회하시겠습니까? 이 키를 사용하는 호출이 즉시 실패합니다.',

  'ai.api.docs': 'API 문서',

  'ai.api.showDocs': '문서 보기',

  'ai.api.hideDocs': '문서 숨기기',

  'ai.api.endpoint': '엔드포인트 URL',

  'ai.api.auth': '인증 방식',

  'ai.api.authDesc': 'Authorization 헤더에 Bearer Token을 전달하여 인증합니다.',

  'ai.api.example': '호출 예시',

  'ai.api.availableModels': '사용 가능한 모델',

  'ai.api.compatibility': '호환성 설명',

  'ai.api.compat1': 'OpenAI Chat Completions API 형식과 완전 호환',

  'ai.api.compat2': '스트리밍(stream: true) 및 비스트리밍 모드 모두 지원',

  'ai.api.compat3': 'openai-python, openai-node 등 공식 SDK로 직접 연동 가능',

  'common.action': '작업',
};

const fr: Dict = {
  'nav.home': 'Accueil',
  'nav.subscription': 'Abonnements',
  'nav.specialized': 'Séries',
  'nav.exploration': 'Revues',
  'nav.assessment': 'Évaluation gratuite',
  'nav.products': 'Tous les produits',
  'nav.more': 'Toute la navigation',
  'nav.groupProducts': 'Contenus',
  'nav.groupLearn': "Outils d’étude",
  'nav.groupCommunity': 'Communauté',
  'nav.groupAccount': 'Mon compte',
  'nav.surveys': 'Sondages',
  'nav.forum': 'Forum',
  'nav.community': 'Communauté',
  'nav.announcements': 'Annonces',
  'nav.search': 'Recherche',
  'nav.login': 'Connexion',
  'nav.register': 'Inscription',
  'nav.logout': 'Déconnexion',
  'nav.account': 'Mon compte',
  'nav.admin': 'Admin',
  'nav.demo': 'Mode démo',
  'footer.categories': 'Collections',
  'footer.legal': 'Mentions légales',
  'footer.features': 'Fonctionnalités',
  'footer.contact': 'Contact et signalement',
  'footer.rights': 'Tous droits réservés',
  'footer.assessment': 'Évaluation gratuite',
  'footer.terms': "Conditions d'utilisation",
  'footer.purchase': "Contrat d'achat de contenu numérique",
  'footer.privacy': 'Politique de confidentialité',
  'footer.antifraud': 'Déclaration anti-contrefaçon',
  'footer.maintenance': 'Politique de maintenance',
  'footer.community': 'Communauté académique',
  'footer.announcements': 'Annonces',
  'footer.search': 'Recherche sur le site',
  'footer.benefits': 'Avantages cumulés',
  'theme.system': 'Système',
  'theme.light': 'Mode clair',
  'theme.dark': 'Mode sombre',
  'lang.label': "Langue de l'interface",
  'hero.badge': 'Study and Explore of Coding',
  'hero.title': 'Étude et exploration du code',
  'hero.line1': 'AI for everyone, coding for everyone.',
  'hero.line2': 'Des tutoriels rigoureux, un contenu aux normes d’ingénierie.',
  'hero.line3': 'SEOC Studio, signé d’un R.',
  'hero.body': 'Nous traitons chaque langage de programmation comme un objet d’étude sérieux. Origines documentées, syntaxe approfondie, tutoriels structurés et revues avec correctifs. Trois collections et vingt projets guident les apprenants du niveau débutant au niveau avancé.',
  'hero.cta1': 'Inscription gratuite, aperçus débloqués',
  'hero.cta2': 'Parcourir tout le contenu',
  'hero.note': 'Après inscription, lisez des extraits gratuits ; le texte intégral et les bonus se débloquent après activation.',
  'hero.stat1': 'Collections',
  'hero.stat2': 'Projets en vente',
  'hero.stat3': 'Numéros prévus',
  'home.collections': 'Trois collections, trois façons de lire',
  'home.viewAll': 'Voir tous les projets',
  'home.howItWorks': 'De l’évaluation à la maîtrise en quatre étapes',
  'home.benefits': 'Avantages cumulés, tous concrets',
  'home.myBenefits': 'Mes avantages',
  'home.latestAnn': 'Dernières annonces',
  'home.allAnn': 'Toutes les annonces',
  'home.promises': 'Nos trois promesses fermes',
  'home.readLegal': 'Lire tous les termes et politiques',
  'home.faq': 'Questions fréquentes',
  'home.ctaTitle': 'Prêt à commencer vos recherches ?',
  'home.ctaRegister': 'Inscription gratuite',
  'home.ctaAssess': 'Faire l’évaluation',
  'reader.prev': 'Numéro précédent',
  'reader.next': 'Numéro suivant',
  'reader.backToToc': 'Retour au sommaire',
  'reader.focus': 'Mode concentration',
  'reader.exitFocus': 'Quitter la concentration',
  'reader.quiz': 'Quiz rapide',
  'reader.highlight': 'Surligner',
  'reader.myMarks': 'Mes surlignages',
  'reader.readingTime': 'Temps de lecture',
  'reader.minutes': 'min',
  'common.loading': 'Chargement',
  'common.loginFirst': 'Veuillez vous connecter',
  'products.pageTitle': 'Tous les projets',
  'products.enter': 'Entrer dans la collection',
  'detail.catalog': 'Sommaire complet',
  'detail.buyNow': 'Acheter',
  'detail.owned': 'Activé',
  'detail.pending': 'En vérification',
  'detail.perks': 'Avantages et notes',
  'auth.email': 'E-mail',
  'auth.password': 'Mot de passe',
  'auth.code': 'Code',
  'auth.sendCode': 'Envoyer le code',
  'auth.login': 'Connexion',
  'auth.register': 'Inscription',
  'auth.reset': 'Réinitialiser le mot de passe',
  'auth.forgot': 'Mot de passe oublié',
  'auth.noAccount': 'Pas encore de compte',
  'auth.hasAccount': 'Déjà un compte',
  'assess.title': 'Évaluation gratuite',
  'assess.start': "Commencer l'évaluation",
  'assess.history': 'Historique',
  'account.title': 'Mon compte',
  'account.purchases': 'Contenus activés',
  'account.pending': 'Demandes en attente',
  'account.benefits': 'Avantages cumulés',
  'common.back': 'Retour',
  'common.submit': 'Envoyer',
  'common.all': 'Tout',
  'common.view': 'Voir',

  'nav.ai': 'Assistant IA',

  'nav.groupAI': 'Plateforme IA',

  'nav.aiCredits': 'Crédits',

  'nav.aiApi': 'Plateforme API',

  'ai.chat.title': 'Assistant IA SEOC',

  'ai.chat.subtitle': 'Assistant de codage intelligent SEOC Studio',

  'ai.chat.welcome': 'Bonjour, je suis votre assistant IA',

  'ai.chat.welcomeDesc': 'Sélectionnez un modèle et posez vos questions de programmation. Toutes les réponses sont facturées en points ; certains modèles offrent un quota gratuit quotidien.',

  'ai.chat.placeholder': 'Tapez votre question, Shift+Entrée pour une nouvelle ligne',

  'ai.chat.send': 'Envoyer',

  'ai.chat.model': 'Choisir le modèle',

  'ai.chat.balance': 'Solde',

  'ai.chat.freeRemaining': 'Gratuit restant aujourd\'hui',

  'ai.chat.freeUsed': 'Gratuit',

  'ai.chat.tokenCost': 'Coût de ce message',

  'ai.chat.interrupted': 'Solde insuffisant, réponse interrompue',

  'ai.chat.noBalance': 'Points insuffisants pour envoyer',

  'ai.chat.footerNote': 'Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne.',

  'ai.chat.suggest1': 'Comment utiliser les décorateurs Python ?',

  'ai.chat.suggest2': 'Expliquez les fermetures JavaScript',

  'ai.chat.suggest3': 'Comment optimiser les performances des requêtes SQL ?',

  'ai.credits.title': 'Gestion des points',

  'ai.credits.subtitle': 'Gérez votre solde, recharges et détails d\'utilisation',

  'ai.credits.name': 'Points',

  'ai.credits.balance': 'Solde actuel',

  'ai.credits.perDay': 'par jour',

  'ai.credits.totalSpent': 'Total dépensé',

  'ai.credits.topup': 'Recharger',

  'ai.credits.selectPlan': 'Choisir un plan de recharge',

  'ai.credits.topupNote': 'Les points sont crédités instantanément. Les produits numériques ne sont pas remboursables après paiement.',

  'ai.credits.history': 'Historique des transactions',

  'ai.credits.usageDetail': 'Détails d\'utilisation',

  'ai.credits.noTransactions': 'Aucune transaction',

  'ai.credits.noUsage': 'Aucun enregistrement d\'utilisation',

  'ai.credits.time': 'Heure',

  'ai.credits.type': 'Type',

  'ai.credits.amount': 'Variation',

  'ai.credits.note': 'Note',

  'ai.credits.model': 'Modèle',

  'ai.credits.cost': 'Coût',

  'ai.credits.status': 'Statut',

  'ai.credits.completed': 'Terminé',

  'ai.credits.provider': 'Fournisseur',

  'ai.credits.typePurchase': 'Recharge',

  'ai.credits.typeConsumption': 'Consommation',

  'ai.credits.typeFreeGrant': 'Quota gratuit',

  'ai.credits.typeRefund': 'Remboursement',

  'ai.credits.typeAdjust': 'Ajustement admin',

  'ai.api.title': 'Plateforme API',

  'ai.api.subtitle': 'Appelez les modèles IA via une interface compatible OpenAI, facturée en points',

  'ai.api.createKey': 'Créer une clé API',

  'ai.api.keyNamePlaceholder': 'Donnez un nom à votre clé',

  'ai.api.create': 'Créer',

  'ai.api.keyCreatedWarning': 'Copiez cette clé maintenant. Elle ne sera plus affichée après fermeture.',

  'ai.api.copy': 'Copier',

  'ai.api.copied': 'Copié',

  'ai.api.myKeys': 'Mes clés',

  'ai.api.noKeys': 'Aucune clé API',

  'ai.api.keyName': 'Nom',

  'ai.api.keyPreview': 'Clé',

  'ai.api.lastUsed': 'Dernière utilisation',

  'ai.api.createdAt': 'Créé le',

  'ai.api.revoke': 'Révoquer',

  'ai.api.revokeConfirm': 'Révoquer cette clé ? Les appels l\'utilisant échoueront immédiatement.',

  'ai.api.docs': 'Documentation API',

  'ai.api.showDocs': 'Afficher la doc',

  'ai.api.hideDocs': 'Masquer la doc',

  'ai.api.endpoint': 'URL du point de terminaison',

  'ai.api.auth': 'Authentification',

  'ai.api.authDesc': 'Passez un Bearer Token dans l\'en-tête Authorization pour vous authentifier.',

  'ai.api.example': 'Exemple d\'appel',

  'ai.api.availableModels': 'Modèles disponibles',

  'ai.api.compatibility': 'Notes de compatibilité',

  'ai.api.compat1': 'Entièrement compatible avec le format de l\'API OpenAI Chat Completions',

  'ai.api.compat2': 'Prend en charge les modes streaming (stream: true) et non-streaming',

  'ai.api.compat3': 'Fonctionne directement avec les SDK officiels tels que openai-python et openai-node',

  'common.action': 'Action',
};

const de: Dict = {
  'nav.home': 'Start',
  'nav.subscription': 'Abonnements',
  'nav.specialized': 'Serien',
  'nav.exploration': 'Journale',
  'nav.assessment': 'Gratis-Test',
  'nav.products': 'Alle Produkte',
  'nav.more': 'Gesamte Navigation',
  'nav.groupProducts': 'Inhalte',
  'nav.groupLearn': 'Lernwerkzeuge',
  'nav.groupCommunity': 'Community',
  'nav.groupAccount': 'Mein Konto',
  'nav.surveys': 'Umfragen',
  'nav.forum': 'Forum',
  'nav.community': 'Community',
  'nav.announcements': 'Ankündigungen',
  'nav.search': 'Suche',
  'nav.login': 'Anmelden',
  'nav.register': 'Registrieren',
  'nav.logout': 'Abmelden',
  'nav.account': 'Mein Konto',
  'nav.admin': 'Admin',
  'nav.demo': 'Demo-Modus',
  'footer.categories': 'Kategorien',
  'footer.legal': 'Rechtliches',
  'footer.features': 'Funktionen',
  'footer.contact': 'Kontakt & Meldung',
  'footer.rights': 'Alle Rechte vorbehalten',
  'footer.assessment': 'Kostenlose Einstufung',
  'footer.terms': 'Nutzungsbedingungen',
  'footer.purchase': 'Kaufvertrag für digitale Inhalte',
  'footer.privacy': 'Datenschutzerklärung',
  'footer.antifraud': 'Anti-Fälschungs-Hinweis',
  'footer.maintenance': 'Wartungsrichtlinie',
  'footer.community': 'Akademische Community',
  'footer.announcements': 'Ankündigungen',
  'footer.search': 'Seitensuche',
  'footer.benefits': 'Treuevorteile',
  'theme.system': 'System',
  'theme.light': 'Helles Design',
  'theme.dark': 'Dunkles Design',
  'lang.label': 'Sprache',
  'hero.badge': 'Study and Explore of Coding',
  'hero.title': 'Programmierung erforschen und entdecken',
  'hero.line1': 'AI for everyone, coding for everyone.',
  'hero.line2': 'Tutorials mit Forschungsanspruch, Inhalte mit Ingenieursstandard.',
  'hero.line3': 'SEOC Studio, gezeichnet mit einem R.',
  'hero.body': 'Wir behandeln jede Programmiersprache als ernsthaftes Forschungsobjekt. Fundierte Geschichte, gründliche Syntax, systematische Tutorials und Journale mit Patches. Drei Kategorien und zwanzig Projekte begleiten Lernende vom Einstieg bis zum Profi.',
  'hero.cta1': 'Kostenlos registrieren und lesen',
  'hero.cta2': 'Alle Inhalte ansehen',
  'hero.note': 'Nach der Registrierung können Sie Auszüge lesen; Volltexte und Bonusmaterial werden nach Freischaltung verfügbar.',
  'hero.stat1': 'Kategorien',
  'hero.stat2': 'Projekte im Angebot',
  'hero.stat3': 'Geplante Ausgaben',
  'home.collections': 'Drei Kategorien, drei Lesarten',
  'home.viewAll': 'Alle Projekte ansehen',
  'home.howItWorks': 'Vom Test zum Studium in vier Schritten',
  'home.benefits': 'Treuevorteile, alles echte Leistungen',
  'home.myBenefits': 'Meine Vorteile',
  'home.latestAnn': 'Neueste Ankündigungen',
  'home.allAnn': 'Alle Ankündigungen',
  'home.promises': 'Unsere drei festen Versprechen',
  'home.readLegal': 'Alle Bedingungen lesen',
  'home.faq': 'Häufige Fragen',
  'home.ctaTitle': 'Bereit für Ihre Forschung?',
  'home.ctaRegister': 'Kostenlos registrieren',
  'home.ctaAssess': 'Zuerst den Test',
  'reader.prev': 'Vorherige Ausgabe',
  'reader.next': 'Nächste Ausgabe',
  'reader.backToToc': 'Zum Inhaltsverzeichnis',
  'reader.focus': 'Fokusmodus',
  'reader.exitFocus': 'Fokus beenden',
  'reader.quiz': 'Schnellquiz',
  'reader.highlight': 'Markieren',
  'reader.myMarks': 'Meine Markierungen',
  'reader.readingTime': 'Lesezeit',
  'reader.minutes': 'Min.',
  'common.loading': 'Wird geladen',
  'common.loginFirst': 'Bitte zuerst anmelden',
  'products.pageTitle': 'Alle Projekte',
  'products.enter': 'Kategorie öffnen',
  'detail.catalog': 'Vollständiges Inhaltsverzeichnis',
  'detail.buyNow': 'Jetzt kaufen',
  'detail.owned': 'Freigeschaltet',
  'detail.pending': 'In Prüfung',
  'detail.perks': 'Vorteile & Hinweise',
  'auth.email': 'E-Mail',
  'auth.password': 'Passwort',
  'auth.code': 'Code',
  'auth.sendCode': 'Code senden',
  'auth.login': 'Anmelden',
  'auth.register': 'Registrieren',
  'auth.reset': 'Passwort zurücksetzen',
  'auth.forgot': 'Passwort vergessen',
  'auth.noAccount': 'Noch kein Konto',
  'auth.hasAccount': 'Bereits ein Konto',
  'assess.title': 'Kostenlose Einstufung',
  'assess.start': 'Test starten',
  'assess.history': 'Verlauf',
  'account.title': 'Mein Konto',
  'account.purchases': 'Freigeschaltete Inhalte',
  'account.pending': 'Offene Anträge',
  'account.benefits': 'Treuevorteile',
  'common.back': 'Zurück',
  'common.submit': 'Absenden',
  'common.all': 'Alle',
  'common.view': 'Ansehen',

  'nav.ai': 'KI-Assistent',

  'nav.groupAI': 'KI-Plattform',

  'nav.aiCredits': 'Punkte verwalten',

  'nav.aiApi': 'API-Plattform',

  'ai.chat.title': 'SEOC KI-Assistent',

  'ai.chat.subtitle': 'SEOC Studio Intelligenter Coding-Assistent',

  'ai.chat.welcome': 'Hallo, ich bin dein KI-Assistent',

  'ai.chat.welcomeDesc': 'Wählen Sie ein Modell und stellen Sie Ihre Programmierfragen. Alle Antworten werden in Punkten abgerechnet; einige Modelle haben ein tägliches Freikontingent.',

  'ai.chat.placeholder': 'Frage eingeben, Shift+Enter für neue Zeile',

  'ai.chat.send': 'Senden',

  'ai.chat.model': 'Modell wählen',

  'ai.chat.balance': 'Guthaben',

  'ai.chat.freeRemaining': 'Heute kostenlos übrig',

  'ai.chat.freeUsed': 'Kostenlos',

  'ai.chat.tokenCost': 'Kosten dieser Nachricht',

  'ai.chat.interrupted': 'Unzureichendes Guthaben, Antwort abgebrochen',

  'ai.chat.noBalance': 'Unzureichende Punkte zum Senden',

  'ai.chat.footerNote': 'Enter zum Senden, Shift+Enter für neue Zeile.',

  'ai.chat.suggest1': 'Wie verwende ich Python-Dekoratoren?',

  'ai.chat.suggest2': 'Erkläre JavaScript Closures',

  'ai.chat.suggest3': 'Wie optimiere ich die SQL-Abfrageleistung?',

  'ai.credits.title': 'Punkte verwalten',

  'ai.credits.subtitle': 'Verwalten Sie Guthaben, Aufladungen und Nutzungsdetails',

  'ai.credits.name': 'Punkte',

  'ai.credits.balance': 'Aktuelles Guthaben',

  'ai.credits.perDay': 'pro Tag',

  'ai.credits.totalSpent': 'Gesamt verbraucht',

  'ai.credits.topup': 'Aufladen',

  'ai.credits.selectPlan': 'Aufladeplan wählen',

  'ai.credits.topupNote': 'Punkte werden sofort gutgeschrieben. Digitale Produkte sind nach Zahlung nicht erstattungsfähig.',

  'ai.credits.history': 'Transaktionsverlauf',

  'ai.credits.usageDetail': 'Nutzungsdetails',

  'ai.credits.noTransactions': 'Keine Transaktionen',

  'ai.credits.noUsage': 'Keine Nutzungsaufzeichnungen',

  'ai.credits.time': 'Zeit',

  'ai.credits.type': 'Typ',

  'ai.credits.amount': 'Änderung',

  'ai.credits.note': 'Notiz',

  'ai.credits.model': 'Modell',

  'ai.credits.cost': 'Kosten',

  'ai.credits.status': 'Status',

  'ai.credits.completed': 'Abgeschlossen',

  'ai.credits.provider': 'Anbieter',

  'ai.credits.typePurchase': 'Aufladung',

  'ai.credits.typeConsumption': 'Verbrauch',

  'ai.credits.typeFreeGrant': 'Freikontingent',

  'ai.credits.typeRefund': 'Erstattung',

  'ai.credits.typeAdjust': 'Admin-Anpassung',

  'ai.api.title': 'API-Plattform',

  'ai.api.subtitle': 'Rufen Sie KI-Modelle über OpenAI-kompatible Schnittstellen auf, Abrechnung in Punkten',

  'ai.api.createKey': 'API-Schlüssel erstellen',

  'ai.api.keyNamePlaceholder': 'Geben Sie Ihrem Schlüssel einen Namen',

  'ai.api.create': 'Erstellen',

  'ai.api.keyCreatedWarning': 'Kopieren Sie diesen Schlüssel jetzt. Er wird nach dem Schließen nicht mehr angezeigt.',

  'ai.api.copy': 'Kopieren',

  'ai.api.copied': 'Kopiert',

  'ai.api.myKeys': 'Meine Schlüssel',

  'ai.api.noKeys': 'Keine API-Schlüssel',

  'ai.api.keyName': 'Name',

  'ai.api.keyPreview': 'Schlüssel',

  'ai.api.lastUsed': 'Zuletzt verwendet',

  'ai.api.createdAt': 'Erstellt',

  'ai.api.revoke': 'Widerrufen',

  'ai.api.revokeConfirm': 'Diesen Schlüssel widerrufen? Aufrufe damit werden sofort fehlschlagen.',

  'ai.api.docs': 'API-Dokumentation',

  'ai.api.showDocs': 'Dokumentation anzeigen',

  'ai.api.hideDocs': 'Dokumentation ausblenden',

  'ai.api.endpoint': 'Endpunkt-URL',

  'ai.api.auth': 'Authentifizierung',

  'ai.api.authDesc': 'Übergeben Sie ein Bearer-Token im Authorization-Header zur Authentifizierung.',

  'ai.api.example': 'Aufrufbeispiel',

  'ai.api.availableModels': 'Verfügbare Modelle',

  'ai.api.compatibility': 'Kompatibilitätshinweise',

  'ai.api.compat1': 'Vollständig kompatibel mit dem OpenAI Chat Completions API-Format',

  'ai.api.compat2': 'Unterstützt sowohl Streaming- (stream: true) als auch Nicht-Streaming-Modi',

  'ai.api.compat3': 'Funktioniert direkt mit offiziellen SDKs wie openai-python und openai-node',

  'common.action': 'Aktion',
};

const es: Dict = {
  'nav.home': 'Inicio',
  'nav.subscription': 'Suscripciones',
  'nav.specialized': 'Series',
  'nav.exploration': 'Revistas',
  'nav.assessment': 'Evaluación gratis',
  'nav.products': 'Todos los productos',
  'nav.more': 'Toda la navegación',
  'nav.groupProducts': 'Contenidos',
  'nav.groupLearn': 'Herramientas',
  'nav.groupCommunity': 'Comunidad',
  'nav.groupAccount': 'Mi cuenta',
  'nav.surveys': 'Encuestas',
  'nav.forum': 'Foro',
  'nav.community': 'Comunidad',
  'nav.announcements': 'Anuncios',
  'nav.search': 'Buscar',
  'nav.login': 'Entrar',
  'nav.register': 'Registrarse',
  'nav.logout': 'Salir',
  'nav.account': 'Mi cuenta',
  'nav.admin': 'Admin',
  'nav.demo': 'Modo demo',
  'footer.categories': 'Colecciones',
  'footer.legal': 'Avisos legales',
  'footer.features': 'Funciones',
  'footer.contact': 'Contacto y reportes',
  'footer.rights': 'Todos los derechos reservados',
  'footer.assessment': 'Evaluación gratuita',
  'footer.terms': 'Términos del servicio',
  'footer.purchase': 'Contrato de compra de contenido digital',
  'footer.privacy': 'Política de privacidad',
  'footer.antifraud': 'Declaración antifalsificación',
  'footer.maintenance': 'Política de mantenimiento',
  'footer.community': 'Comunidad académica',
  'footer.announcements': 'Anuncios',
  'footer.search': 'Búsqueda del sitio',
  'footer.benefits': 'Beneficios acumulados',
  'theme.system': 'Sistema',
  'theme.light': 'Modo claro',
  'theme.dark': 'Modo oscuro',
  'lang.label': 'Idioma',
  'hero.badge': 'Study and Explore of Coding',
  'hero.title': 'Estudio y exploración de la programación',
  'hero.line1': 'AI for everyone, coding for everyone.',
  'hero.line2': 'Tutoriales con rigor de investigación, contenido con estándares de ingeniería.',
  'hero.line3': 'SEOC Studio, firmado con una R.',
  'hero.body': 'Tratamos cada lenguaje de programación como un objeto de estudio serio. Orígenes documentados, sintaxis exhaustiva, tutoriales sistemáticos y revistas con parches. Tres colecciones y veinte proyectos guían al estudiante de principiante a avanzado.',
  'hero.cta1': 'Regístrate gratis y lee vistas previas',
  'hero.cta2': 'Ver todo el contenido',
  'hero.note': 'Tras registrarte puedes leer extractos; el texto completo y los materiales se desbloquean al activar.',
  'hero.stat1': 'Colecciones',
  'hero.stat2': 'Proyectos en venta',
  'hero.stat3': 'Números planeados',
  'home.collections': 'Tres colecciones, tres formas de leer',
  'home.viewAll': 'Ver todos los proyectos',
  'home.howItWorks': 'De la evaluación al estudio en cuatro pasos',
  'home.benefits': 'Beneficios acumulados, todos reales',
  'home.myBenefits': 'Mis beneficios',
  'home.latestAnn': 'Últimos anuncios',
  'home.allAnn': 'Todos los anuncios',
  'home.promises': 'Nuestras tres promesas firmes',
  'home.readLegal': 'Leer todos los términos',
  'home.faq': 'Preguntas frecuentes',
  'home.ctaTitle': '¿Listo para empezar a investigar?',
  'home.ctaRegister': 'Registro gratis',
  'home.ctaAssess': 'Hacer la evaluación',
  'reader.prev': 'Número anterior',
  'reader.next': 'Número siguiente',
  'reader.backToToc': 'Volver al índice',
  'reader.focus': 'Modo concentración',
  'reader.exitFocus': 'Salir del modo',
  'reader.quiz': 'Quiz rápido',
  'reader.highlight': 'Resaltar',
  'reader.myMarks': 'Mis resaltados',
  'reader.readingTime': 'Tiempo de lectura',
  'reader.minutes': 'min',
  'common.loading': 'Cargando',
  'common.loginFirst': 'Inicia sesión primero',
  'products.pageTitle': 'Todos los proyectos',
  'products.enter': 'Entrar a la colección',
  'detail.catalog': 'Índice completo',
  'detail.buyNow': 'Comprar ahora',
  'detail.owned': 'Activado',
  'detail.pending': 'En revisión',
  'detail.perks': 'Ventajas y notas',
  'auth.email': 'Correo',
  'auth.password': 'Contraseña',
  'auth.code': 'Código',
  'auth.sendCode': 'Enviar código',
  'auth.login': 'Entrar',
  'auth.register': 'Registrarse',
  'auth.reset': 'Restablecer contraseña',
  'auth.forgot': 'Olvidé mi contraseña',
  'auth.noAccount': '¿Sin cuenta?',
  'auth.hasAccount': '¿Ya tienes cuenta?',
  'assess.title': 'Evaluación gratuita',
  'assess.start': 'Iniciar evaluación',
  'assess.history': 'Historial',
  'account.title': 'Mi cuenta',
  'account.purchases': 'Contenido activado',
  'account.pending': 'Solicitudes pendientes',
  'account.benefits': 'Beneficios acumulados',
  'common.back': 'Volver',
  'common.submit': 'Enviar',
  'common.all': 'Todo',
  'common.view': 'Ver',

  'nav.ai': 'Asistente IA',

  'nav.groupAI': 'Plataforma IA',

  'nav.aiCredits': 'Créditos',

  'nav.aiApi': 'Plataforma API',

  'ai.chat.title': 'Asistente IA SEOC',

  'ai.chat.subtitle': 'Asistente de codificación inteligente SEOC Studio',

  'ai.chat.welcome': 'Hola, soy tu asistente IA',

  'ai.chat.welcomeDesc': 'Selecciona un modelo y haz tus preguntas de programación. Todas las respuestas se facturan en puntos; algunos modelos incluyen una cuota gratuita diaria.',

  'ai.chat.placeholder': 'Escribe tu pregunta, Shift+Enter para nueva línea',

  'ai.chat.send': 'Enviar',

  'ai.chat.model': 'Seleccionar modelo',

  'ai.chat.balance': 'Saldo',

  'ai.chat.freeRemaining': 'Gratis restante hoy',

  'ai.chat.freeUsed': 'Gratis',

  'ai.chat.tokenCost': 'Coste de este mensaje',

  'ai.chat.interrupted': 'Saldo insuficiente, respuesta interrumpida',

  'ai.chat.noBalance': 'Puntos insuficientes para enviar',

  'ai.chat.footerNote': 'Pulsa Enter para enviar, Shift+Enter para nueva línea.',

  'ai.chat.suggest1': '¿Cómo usar decoradores en Python?',

  'ai.chat.suggest2': 'Explica las closures de JavaScript',

  'ai.chat.suggest3': '¿Cómo optimizar el rendimiento de consultas SQL?',

  'ai.credits.title': 'Gestión de puntos',

  'ai.credits.subtitle': 'Gestiona tu saldo, recargas y detalles de uso',

  'ai.credits.name': 'Puntos',

  'ai.credits.balance': 'Saldo actual',

  'ai.credits.perDay': 'por día',

  'ai.credits.totalSpent': 'Total gastado',

  'ai.credits.topup': 'Recargar',

  'ai.credits.selectPlan': 'Seleccionar plan de recarga',

  'ai.credits.topupNote': 'Los puntos se acreditan al instante. Los productos digitales no son reembolsables tras el pago.',

  'ai.credits.history': 'Historial de transacciones',

  'ai.credits.usageDetail': 'Detalles de uso',

  'ai.credits.noTransactions': 'Sin transacciones',

  'ai.credits.noUsage': 'Sin registros de uso',

  'ai.credits.time': 'Hora',

  'ai.credits.type': 'Tipo',

  'ai.credits.amount': 'Cambio',

  'ai.credits.note': 'Nota',

  'ai.credits.model': 'Modelo',

  'ai.credits.cost': 'Coste',

  'ai.credits.status': 'Estado',

  'ai.credits.completed': 'Completado',

  'ai.credits.provider': 'Proveedor',

  'ai.credits.typePurchase': 'Recarga',

  'ai.credits.typeConsumption': 'Consumo',

  'ai.credits.typeFreeGrant': 'Cuota gratuita',

  'ai.credits.typeRefund': 'Reembolso',

  'ai.credits.typeAdjust': 'Ajuste de admin',

  'ai.api.title': 'Plataforma API',

  'ai.api.subtitle': 'Llama a modelos IA mediante interfaz compatible con OpenAI, facturado en puntos',

  'ai.api.createKey': 'Crear clave API',

  'ai.api.keyNamePlaceholder': 'Dale un nombre a tu clave',

  'ai.api.create': 'Crear',

  'ai.api.keyCreatedWarning': 'Copia esta clave ahora. No se mostrará de nuevo después de cerrar.',

  'ai.api.copy': 'Copiar',

  'ai.api.copied': 'Copiado',

  'ai.api.myKeys': 'Mis claves',

  'ai.api.noKeys': 'Sin claves API',

  'ai.api.keyName': 'Nombre',

  'ai.api.keyPreview': 'Clave',

  'ai.api.lastUsed': 'Último uso',

  'ai.api.createdAt': 'Creado',

  'ai.api.revoke': 'Revocar',

  'ai.api.revokeConfirm': '¿Revocar esta clave? Las llamadas que la usen fallarán inmediatamente.',

  'ai.api.docs': 'Documentación API',

  'ai.api.showDocs': 'Mostrar docs',

  'ai.api.hideDocs': 'Ocultar docs',

  'ai.api.endpoint': 'URL del endpoint',

  'ai.api.auth': 'Autenticación',

  'ai.api.authDesc': 'Pasa un Bearer Token en el encabezado Authorization para autenticarte.',

  'ai.api.example': 'Ejemplo de llamada',

  'ai.api.availableModels': 'Modelos disponibles',

  'ai.api.compatibility': 'Notas de compatibilidad',

  'ai.api.compat1': 'Totalmente compatible con el formato de la API OpenAI Chat Completions',

  'ai.api.compat2': 'Admite modos streaming (stream: true) y no-streaming',

  'ai.api.compat3': 'Funciona directamente con SDKs oficiales como openai-python y openai-node',

  'common.action': 'Acción',
};

const ru: Dict = {
  'nav.home': 'Главная',
  'nav.subscription': 'Подписки',
  'nav.specialized': 'Серии',
  'nav.exploration': 'Журналы',
  'nav.assessment': 'Бесплатный тест',
  'nav.products': 'Все продукты',
  'nav.more': 'Вся навигация',
  'nav.groupProducts': 'Материалы',
  'nav.groupLearn': 'Инструменты',
  'nav.groupCommunity': 'Сообщество',
  'nav.groupAccount': 'Мой аккаунт',
  'nav.surveys': 'Опросы',
  'nav.forum': 'Форум',
  'nav.community': 'Сообщество',
  'nav.announcements': 'Объявления',
  'nav.search': 'Поиск',
  'nav.login': 'Войти',
  'nav.register': 'Регистрация',
  'nav.logout': 'Выйти',
  'nav.account': 'Кабинет',
  'nav.admin': 'Админ',
  'nav.demo': 'Демо-режим',
  'footer.categories': 'Разделы',
  'footer.legal': 'Правовая информация',
  'footer.features': 'Возможности',
  'footer.contact': 'Контакты и жалобы',
  'footer.rights': 'Все права защищены',
  'footer.assessment': 'Бесплатная оценка навыков',
  'footer.terms': 'Пользовательское соглашение',
  'footer.purchase': 'Договор покупки цифрового контента',
  'footer.privacy': 'Политика конфиденциальности',
  'footer.antifraud': 'Заявление о подделках',
  'footer.maintenance': 'Политика поддержки',
  'footer.community': 'Академическое сообщество',
  'footer.announcements': 'Объявления',
  'footer.search': 'Поиск по сайту',
  'footer.benefits': 'Накопительные привилегии',
  'theme.system': 'Системная',
  'theme.light': 'Светлая тема',
  'theme.dark': 'Тёмная тема',
  'lang.label': 'Язык интерфейса',
  'hero.badge': 'Study and Explore of Coding',
  'hero.title': 'Изучение и исследование программирования',
  'hero.line1': 'AI for everyone, coding for everyone.',
  'hero.line2': 'Учебники с научной строгостью, контент по инженерным стандартам.',
  'hero.line3': 'SEOC Studio, подписано буквой R.',
  'hero.body': 'Мы относимся к каждому языку программирования как к серьёзному объекту исследования. Проверенная история, глубокий разбор синтаксиса, системные учебники и журналы с патчами. Три раздела и двадцать проектов ведут от новичка до специалиста.',
  'hero.cta1': 'Регистрация и пробное чтение',
  'hero.cta2': 'Весь контент',
  'hero.note': 'После регистрации доступны фрагменты; полные тексты и бонусы открываются после активации.',
  'hero.stat1': 'Разделы',
  'hero.stat2': 'Проектов в продаже',
  'hero.stat3': 'Запланировано выпусков',
  'home.collections': 'Три раздела, три способа чтения',
  'home.viewAll': 'Все проекты',
  'home.howItWorks': 'От теста к чтению за четыре шага',
  'home.benefits': 'Накопительные привилегии, всё по-настоящему',
  'home.myBenefits': 'Мои привилегии',
  'home.latestAnn': 'Свежие объявления',
  'home.allAnn': 'Все объявления',
  'home.promises': 'Наши три твёрдых обещания',
  'home.readLegal': 'Читать все соглашения',
  'home.faq': 'Частые вопросы',
  'home.ctaTitle': 'Готовы начать исследование?',
  'home.ctaRegister': 'Регистрация',
  'home.ctaAssess': 'Пройти тест',
  'reader.prev': 'Прошлый выпуск',
  'reader.next': 'Следующий выпуск',
  'reader.backToToc': 'К оглавлению',
  'reader.focus': 'Режим фокуса',
  'reader.exitFocus': 'Выйти из фокуса',
  'reader.quiz': 'Быстрая викторина',
  'reader.highlight': 'Выделить',
  'reader.myMarks': 'Мои выделения',
  'reader.readingTime': 'Время чтения',
  'reader.minutes': 'мин',
  'common.loading': 'Загрузка',
  'common.loginFirst': 'Сначала войдите',
  'products.pageTitle': 'Все проекты',
  'products.enter': 'Перейти в раздел',
  'detail.catalog': 'Полное оглавление',
  'detail.buyNow': 'Купить',
  'detail.owned': 'Активировано',
  'detail.pending': 'На проверке',
  'detail.perks': 'Преимущества и примечания',
  'auth.email': 'Почта',
  'auth.password': 'Пароль',
  'auth.code': 'Код',
  'auth.sendCode': 'Отправить код',
  'auth.login': 'Войти',
  'auth.register': 'Регистрация',
  'auth.reset': 'Сброс пароля',
  'auth.forgot': 'Забыли пароль',
  'auth.noAccount': 'Нет аккаунта',
  'auth.hasAccount': 'Уже есть аккаунт',
  'assess.title': 'Бесплатная оценка',
  'assess.start': 'Начать тест',
  'assess.history': 'История',
  'account.title': 'Кабинет',
  'account.purchases': 'Активированный контент',
  'account.pending': 'Заявки на проверке',
  'account.benefits': 'Накопительные привилегии',
  'common.back': 'Назад',
  'common.submit': 'Отправить',
  'common.all': 'Все',
  'common.view': 'Смотреть',

  'nav.ai': 'ИИ-ассистент',

  'nav.groupAI': 'ИИ-платформа',

  'nav.aiCredits': 'Баллы',

  'nav.aiApi': 'API-платформа',

  'ai.chat.title': 'ИИ-ассистент SEOC',

  'ai.chat.subtitle': 'Интеллектуальный помощник SEOC Studio',

  'ai.chat.welcome': 'Привет, я ваш ИИ-ассистент',

  'ai.chat.welcomeDesc': 'Выберите модель и задайте вопрос по программированию. Все ответы тарифицируются в баллах; у некоторых моделей есть ежедневная бесплатная квота.',

  'ai.chat.placeholder': 'Введите вопрос, Shift+Enter для новой строки',

  'ai.chat.send': 'Отправить',

  'ai.chat.model': 'Выбрать модель',

  'ai.chat.balance': 'Баланс',

  'ai.chat.freeRemaining': 'Бесплатно осталось сегодня',

  'ai.chat.freeUsed': 'Бесплатно',

  'ai.chat.tokenCost': 'Стоимость этого сообщения',

  'ai.chat.interrupted': 'Недостаточно баллов, ответ прерван',

  'ai.chat.noBalance': 'Недостаточно баллов для отправки',

  'ai.chat.footerNote': 'Enter для отправки, Shift+Enter для новой строки.',

  'ai.chat.suggest1': 'Как использовать декораторы в Python?',

  'ai.chat.suggest2': 'Объясните замыкания в JavaScript',

  'ai.chat.suggest3': 'Как оптимизировать производительность SQL-запросов?',

  'ai.credits.title': 'Управление баллами',

  'ai.credits.subtitle': 'Управление балансом, пополнениями и деталями использования',

  'ai.credits.name': 'Баллы',

  'ai.credits.balance': 'Текущий баланс',

  'ai.credits.perDay': 'в день',

  'ai.credits.totalSpent': 'Всего потрачено',

  'ai.credits.topup': 'Пополнить',

  'ai.credits.selectPlan': 'Выбрать план пополнения',

  'ai.credits.topupNote': 'Баллы зачисляются мгновенно. Цифровые товары не подлежат возврату после оплаты.',

  'ai.credits.history': 'История транзакций',

  'ai.credits.usageDetail': 'Детали использования',

  'ai.credits.noTransactions': 'Нет транзакций',

  'ai.credits.noUsage': 'Нет записей использования',

  'ai.credits.time': 'Время',

  'ai.credits.type': 'Тип',

  'ai.credits.amount': 'Изменение',

  'ai.credits.note': 'Примечание',

  'ai.credits.model': 'Модель',

  'ai.credits.cost': 'Стоимость',

  'ai.credits.status': 'Статус',

  'ai.credits.completed': 'Завершено',

  'ai.credits.provider': 'Провайдер',

  'ai.credits.typePurchase': 'Пополнение',

  'ai.credits.typeConsumption': 'Потребление',

  'ai.credits.typeFreeGrant': 'Бесплатная квота',

  'ai.credits.typeRefund': 'Возврат',

  'ai.credits.typeAdjust': 'Корректировка админа',

  'ai.api.title': 'API-платформа',

  'ai.api.subtitle': 'Вызов ИИ-моделей через OpenAI-совместимый интерфейс, тарификация в баллах',

  'ai.api.createKey': 'Создать API-ключ',

  'ai.api.keyNamePlaceholder': 'Дайте имя вашему ключу',

  'ai.api.create': 'Создать',

  'ai.api.keyCreatedWarning': 'Скопируйте этот ключ сейчас. После закрытия он больше не будет показан.',

  'ai.api.copy': 'Копировать',

  'ai.api.copied': 'Скопировано',

  'ai.api.myKeys': 'Мои ключи',

  'ai.api.noKeys': 'Нет API-ключей',

  'ai.api.keyName': 'Имя',

  'ai.api.keyPreview': 'Ключ',

  'ai.api.lastUsed': 'Последнее использование',

  'ai.api.createdAt': 'Создано',

  'ai.api.revoke': 'Отозвать',

  'ai.api.revokeConfirm': 'Отозвать этот ключ? Вызовы с его использованием немедленно перестанут работать.',

  'ai.api.docs': 'Документация API',

  'ai.api.showDocs': 'Показать документацию',

  'ai.api.hideDocs': 'Скрыть документацию',

  'ai.api.endpoint': 'URL эндпоинта',

  'ai.api.auth': 'Аутентификация',

  'ai.api.authDesc': 'Передайте Bearer Token в заголовке Authorization для аутентификации.',

  'ai.api.example': 'Пример вызова',

  'ai.api.availableModels': 'Доступные модели',

  'ai.api.compatibility': 'Примечания о совместимости',

  'ai.api.compat1': 'Полностью совместим с форматом OpenAI Chat Completions API',

  'ai.api.compat2': 'Поддерживает как потоковый (stream: true), так и непотоковый режимы',

  'ai.api.compat3': 'Работает напрямую с официальными SDK, такими как openai-python и openai-node',

  'common.action': 'Действие',
};

const DICTS: Record<Lang, Dict> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja,
  ko,
  fr,
  de,
  es,
  ru
};

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<I18nCtx>({ lang: 'zh-CN', setLang: () => undefined, t: (k) => k });

const STORAGE_KEY = 'seoc-lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && saved in DICTS ? (saved as Lang) : 'zh-CN';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: string) => DICTS[lang][key] ?? zhCN[key] ?? key;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
