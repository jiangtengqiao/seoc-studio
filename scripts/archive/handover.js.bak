const path = require('path');
const h = require(path.join(process.env.SKILL_PATH, 'docx', 'scripts', 'docx-helper'))({
  fonts: { heading: 'SimHei', body: 'SimSun' },
  colors: { primary: '1E3A8A', accent: '3B6EF6', text: '333333', light: 'F2F6FC' },
  page: { size: 'A4' },
});

const C = h.colors;
const hf = h.headerFooter('SEOC Studio 项目完整交接文档');

function coverSection() {
  return [
    h.spacer(2800),
    h.p('SEOC Studio', { size: 52, bold: true, color: 'FFFFFF', align: 'center' }),
    h.spacer(300),
    h.p('编程教育数字内容销售平台', { size: 28, bold: true, color: 'FFFFFF', align: 'center' }),
    h.spacer(500),
    h.p('项目完整交接文档（前端 · 后端 · 部署 · 运维 · 内容生产）', { size: 18, color: 'D6E4FF', align: 'center' }),
    h.spacer(1500),
    h.p('编程研究与探索有限公司 · 负责人 JTQ', { size: 16, color: 'D6E4FF', align: 'center' }),
    h.spacer(200),
    h.p('文档版本 v1.0 · 2026 年 8 月 12 日', { size: 16, color: 'D6E4FF', align: 'center' }),
  ];
}

function tocSection() {
  return [h.h1('目  录', { align: 'center' }), h.spacer(200), h.toc()];
}

// 第一章 项目总览
function chapter1() {
  return [
    h.h1('第一章 项目总览'),
    h.p('SEOC Studio 是编程研究与探索有限公司旗下的编程教育数字内容销售平台，以"研究级"深度长文为核心商品，已经形成真实可运转的商业闭环：注册验证、双码支付、人工开通、版权防护、能力评估、累计回馈、问卷调研与用户社区。'),
    h.h2('1.1 基本信息'),
    h.table({ header: ['项目', '内容'], rows:
      [
        ['公司全称', '编程研究与探索有限公司'],
        ['品牌', 'SEOC Studio（Study and Explore of Coding，R 形签名，SEOC 大写）'],
        ['负责人', 'JTQ'],
        ['唯一官方邮箱', 'jiangtengqiao@qq.com'],
        ['线上地址', 'https://jiangtengqiao.github.io/seoc-studio/'],
        ['代码仓库', 'GitHub：jiangtengqiao/seoc-studio（main 分支）'],
        ['托管', 'GitHub Pages（免费）+ GitHub Actions 自动部署'],
        ['数据库', 'Supabase（项目 hjmgwlxohxinqhwxdspf，新加坡区域）'],
      ],
      widths: [2400, 7200] })
    ,
    h.h2('1.2 商业模式与产品门类'),
    h.p('平台销售三大门类数字内容，均为在线阅读许可，不提供整册下载：'),
    h.bullet('订阅式项目：一次性付费，永久查阅，持续维护和更新（单篇不少于 22000 字）。'),
    h.bullet('专研式项目：按项目付费，每期不少于 26000 字，持续维护但不持续更新，附赠资料。'),
    h.bullet('探索式项目：面向高阶学者的连载期刊，附赠 QQ/微信学术交流群资格，仅官网开放全期次选购，有总期刊包组合优惠。'),
    h.h2('1.3 已形成的业务闭环'),
    h.numbered('用户注册（邮箱验证码）→ 免费能力评估（每日 2 次、每月 15 次，不设付费加量）→ 产品页试读与咨询 → 扫码支付（支付宝/微信双码同屏，选中清晰、未选锁定覆盖）→ 提交付款信息 → 人工核验开通 → 在线阅读（防截屏保护+动态水印）→ 累计消费分档回馈 → 问卷调研与讨论区社区运营。'),
    h.p('定价原则：不促销、不打折、不议价，官网价格为唯一有效价格；数字商品一经支付概不退款（例外见《退款政策》）。'),
  ];
}

// 第二章 技术栈与总体架构
function chapter2() {
  return [
    h.h1('第二章 技术栈与总体架构'),
    h.h2('2.1 技术栈'),
    h.table({ header: ['层次', '技术选型', '说明'], rows:
      [
        ['构建', 'Vite 5', 'React 插件，base 为 /seoc-studio/'],
        ['前端框架', 'React 18 + TypeScript', '函数组件 + Hooks'],
        ['路由', 'React Router v6', 'BrowserRouter，basename=/seoc-studio'],
        ['样式', 'Tailwind CSS 3', 'darkMode: class；自定义 prose-seoc 排版与大量动画'],
        ['内容渲染', 'react-markdown + remark-gfm', '正文 Markdown 经 import.meta.glob(?raw) 打包'],
        ['后端', 'Supabase', 'Auth + Postgres + RLS + Edge Functions'],
        ['邮件', 'Supabase Edge Function + QQ 邮箱 SMTP', '发件 SEOC Studio <jiangtengqiao@qq.com>'],
        ['部署', 'GitHub Actions → GitHub Pages', 'push main 自动构建发布'],
        ['依赖注入', 'mammoth（懒加载）', '后台解析 Word 问卷文档'],
      ],
      widths: [1800, 3600, 4200] })
    ,
    h.h2('2.2 双模架构（重要）'),
    h.p('整套数据层设计了"云端模式 / 本地模式"双模回退：当 Supabase 环境变量存在时走云端（isCloudEnabled=true），否则自动回退到 localStorage 演示模式（local- 前缀的内存账户）。所有数据模块（inquiries、purchases、surveys、forum、announcements、issues、assessment 等）都遵循同一模式：先判 isCloudEnabled && supabase，云端走表，本地走 localStorage 键 seoc.local.*。新功能必须保持这一模式。'),
    h.h2('2.3 环境变量'),
    h.bullet('VITE_SUPABASE_URL：https://hjmgwlxohxinqhwxdspf.supabase.co'),
    h.bullet('VITE_SUPABASE_ANON_KEY：公开匿名密钥（配置于 GitHub Secrets，Actions 构建时注入 .env.production）'),
    h.p('注意：service_role 密钥只存在于 Supabase Edge Function 环境中，前端绝不使用。'),
  ];
}

// 第三章 目录结构
function chapter3() {
  return [
    h.h1('第三章 目录结构与关键文件'),
    h.p('项目根目录为 seoc-studio/，关键结构如下：'),
    h.table({ header: ['路径', '职责'], rows:
      [
        ['src/App.tsx', '全部路由注册'],
        ['src/main.tsx', '入口：挂 AuthProvider / ThemeProvider / I18nProvider'],
        ['src/styles/index.css', '全局样式、prose-seoc 排版、全部动画 keyframes、.dark 覆盖层'],
        ['src/lib/supabase.ts', 'Supabase 客户端与 isCloudEnabled 判定'],
        ['src/lib/auth.tsx', 'AuthProvider：cloud（Supabase Auth）与 local 双模'],
        ['src/lib/theme.tsx', '主题三态（light/dark/system）'],
        ['src/lib/i18n.tsx', '九语言词典与 t() 函数'],
        ['src/lib/content.ts', '法律文档与期刊内容的读取、公告、开通状态'],
        ['src/lib/surveys.ts', '问卷解析器 + 问卷 CRUD + 答卷提交'],
        ['src/lib/forum.ts', '讨论区帖子与评论 CRUD'],
        ['src/lib/inquiries.ts', '咨询与选购申请'],
        ['src/data/products.ts', '全部产品定义、定价、目录结构（核心数据文件）'],
        ['src/components/Layout.tsx', '全局布局：导航 mega menu、页脚、主题语言切换'],
        ['src/components/fx.tsx', '全部交互动效组件（探照灯、跑马灯、极光、时钟等）'],
        ['src/components/PurchasePanel.tsx', '购买面板：双码支付、开通申请'],
        ['src/components/TocNav.tsx', '阅读页大纲导航（scrollspy + 折叠）'],
        ['src/components/ReaderPlay.tsx', '阅读趣味交互四件套'],
        ['src/components/SurveyAdmin.tsx', '后台问卷管理'],
        ['src/pages/*', '16 个页面组件'],
        ['src/content/legal/*.md', '12 篇法律文本'],
        ['src/content/issues/**.md', '已发布期刊正文'],
        ['src/content/surveys/*.md', '内置问卷源文件'],
        ['public/pay/*.png', '支付宝与微信收款码'],
        ['supabase/*.sql', '数据库脚本（schema、修复、问卷论坛）'],
        ['supabase/functions/*', 'Edge Functions（发邮件）'],
        ['scripts/*.py', '大纲生成器与各版本补丁脚本'],
        ['.web_builder/plan.md', '历次版本建设记录'],
      ],
      widths: [3800, 5800] })
    ,
  ];
}

// 第四章 页面与路由
function chapter4() {
  return [
    h.h1('第四章 前端页面与路由清单'),
    h.table({ header: ['路由', '页面组件', '说明'], rows:
      [
        ['/', 'Home', '落地页：hero 代码窗口、探照灯试读、产品门类、体量总览、功能导览、FAQ、跑马灯'],
        ['/products', 'Products', '全部产品总目录'],
        ['/products/:category', 'Products', '按门类（subscription/specialized/exploration）筛选'],
        ['/product/:slug', 'ProductDetail', '产品详情：目录、试读、购买面板、咨询入口'],
        ['/reader/:product/:issue', 'Reader', '阅读器：正文渲染、大纲导航、趣味交互、上下期指引'],
        ['/assessment', 'Assessment', '能力评估：动态出题、六维雷达图、历史记录、答题详情、额度提示'],
        ['/surveys', 'Surveys', '问卷中心列表（登录可答）'],
        ['/surveys/:slug', 'SurveyDetail', '问卷作答：分节导航、实时进度、四题型、必答校验、只读答卷'],
        ['/forum', 'Forum', '讨论区：发帖、五标签筛选'],
        ['/forum/:id', 'ForumPost', '帖子详情与评论'],
        ['/community', 'CommunityPage', '官方社群（QQ/微信群）介绍'],
        ['/announcements', 'Announcements', '平台公告列表'],
        ['/search', 'SearchPage', '全站检索（目录、公告、协议）'],
        ['/legal 与 /legal/:doc', 'Legal', '协议目录（显示字数）与正文，文内协议互链走前端路由'],
        ['/account', 'Account', '用户中心：已购内容、订单、评估历史、累计回馈进度'],
        ['/auth/*', 'Auth', '登录、注册、忘记密码（邮箱验证码）'],
        ['/admin', 'Admin', '后台：期刊发布、公告、购买核验、咨询回复、问卷管理'],
      ],
      widths: [2600, 2200, 4800] })
    ,
    h.p('强制性措施：阅读已购内容、参与评估、作答问卷、发帖评论均需登录；管理后台仅管理员邮箱（jiangtengqiao@qq.com，profiles.role=admin）可见。'),
  ];
}

// 第五章 核心系统详解
function chapter5() {
  return [
    h.h1('第五章 核心系统详解'),
    h.h2('5.1 认证系统'),
    h.p('注册流程：填写邮箱密码 → Edge Function 发送 6 位验证码（QQ 邮箱 SMTP，邮件极简风格但内容丰富，验证码居中放大，上下有声明与联系方式）→ 校验后建号。忘记密码同样走验证码。QQ/微信绑定目前为占位入口。local 模式下验证码直接显示在页面提示中，便于演示。'),
    h.h2('5.2 产品与定价'),
    h.p('全部产品集中在 src/data/products.ts 定义，包含 slug、门类、标题、简介、价格、单位、期数、字数承诺、目录树（章→节）、试读章节标记、附赠资料清单。EXPLORATION_BUNDLE_SLUG 为探索式总期刊包。修改产品只需改这一个文件。'),
    h.h2('5.3 购买与支付'),
    h.p('PurchasePanel 实现双码同屏：支付宝与微信收款码并排展示，点击哪个哪个清晰（pay-reveal 揭晓动效），未选中的被斜纹磨砂锁定覆盖（pay-lock，无法扫码），可随时切换。支付后用户提交付款人信息，写入 purchases 表（status=pending），管理员在后台"购买核验"中确认到账后改为 confirmed，trigger 自动开通对应 issues 的阅读权限。数字商品不退款，协议多处显著提示。'),
    h.h2('5.4 阅读器'),
    h.p('Reader.tsx 渲染 Markdown 正文。TocNav.tsx 提供大纲导航：extractToc 提取 h2/h3，createHeadingComponents 按"同文本出现次数取模"生成稳定 id（这是关键设计，渲染期自增计数器会在滚动重渲染时漂移导致导航失效），scrollspy 用 requestAnimationFrame 节流，跳转带 scroll-mt-24 偏移，侧栏可折叠。ReaderPlay.tsx 提供阅读计时、25/50/75/99% 里程碑、划重点（localStorage 按期刊持久化）、快问快答。章节底部有上一页/下一章指引与目录速览。'),
    h.h2('5.5 版权保护'),
    h.p('已购内容阅读页部署三道防线：一，动态水印（含用户标识，持续移动跳动，不影响阅读）；二，全键盘活动检测（Ctrl/Alt/Shift/Tab/Caps 及截屏组合键等任何按键触发即黑屏，操作结束恢复）；三，权限校验（未购内容仅试读章节可见，其余由 LensGate 探照灯试读遮盖）。'),
    h.h2('5.6 能力评估'),
    h.p('题库 150 道以上（src/data 内），六维出题，每次动态抽取 24 题，维度不向用户显示。提交后实时生成六维雷达图并留存历史，可查看每次答题详情。额度：每日 2 次、每月 15 次，纯免费无付费加量。'),
    h.h2('5.7 问卷中心'),
    h.p('src/lib/surveys.ts 的 parseSurveyMarkdown 把约定格式的 Markdown 解析为结构化问卷：中文数字加顿号开头为分节；题目行以（单选）（多选）（排序题）（开放填空）结尾；缩进行为选项；问号结尾无类型标注按开放题；💡 起为内部附录（不向用户展示）。内置首份 45 题用户体验调研问卷（ux-research-v2.md）。后台可粘贴文本或上传 .md/.txt/.docx（mammoth 懒加载解析）一键下发，含解析预览、草稿、上下架、答卷明细查看。每用户每问卷限提交一次（数据库 unique 约束）。'),
    h.h2('5.8 讨论区'),
    h.p('forum_posts 与 forum_comments 两表，公开可读、登录可写、作者或管理员可删。五个标签：学习交流、产品建议、问题反馈、晒单分享、闲聊灌水。'),
    h.h2('5.9 法律文本'),
    h.p('12 篇法律文本位于 src/content/legal/，四篇主文档（隐私政策、用户服务协议、数字内容购买协议、侵权投诉与维权指引）各约 6000-7600 字（纯汉字计），均含底部"相关协议与联动"互链，Legal.tsx 把文内相对链接渲染为前端路由跳转，目录页显示各文档字数。隐私政策含未成年人专章、SDK 目录表、支付/电子/线上政策专节。'),
  ];
}

// 第六章 主题与国际化
function chapter6() {
  return [
    h.h1('第六章 主题与国际化'),
    h.h2('6.1 主题系统'),
    h.p('src/lib/theme.tsx 实现 light/dark/system 三态，存 localStorage 键 seoc-theme，监听 matchMedia。Tailwind 配置 darkMode: class，暗色样式集中在 index.css 的 .dark 覆盖层（约 90 行全局覆盖），而非逐组件 dark: 变体——这是当时为一次覆盖全站而做的架构决策，新增组件时如颜色异常应优先检查覆盖层。'),
    h.h2('6.2 国际化'),
    h.p('src/lib/i18n.tsx 内置九语言词典（zh-CN、zh-TW、en、ja、ko、fr、de、es、ru），约 110 个键，存 localStorage 键 seoc-lang，t() 缺失时回退 zhCN。界面 chrome 全部走 i18n，正文内容保持中文（内容本身是中文商品）。新增界面文案必须九语言同步，此前用 scripts/patch-i18n*.py 批量注入，注意不要破坏各语言块的唯一锚点。'),
  ];
}

// 第七章 交互动效系统
function chapter7() {
  return [
    h.h1('第七章 交互动效系统（fx.tsx）'),
    h.h2('7.1 组件清单'),
    h.table({ header: ['组件', '作用'], rows:
      [
        ['RevealLens / LensGate', '探照灯试读：光圈下可见正文节选，按住放大 1.4 倍，空闲自动游走'],
        ['ScrollProgress', '顶部阅读进度条'],
        ['Marquee', '公告跑马灯'],
        ['Reveal / useReveal', '滚动入场动画'],
        ['TiltCard', '卡片 3D 倾斜'],
        ['Spotlight', '卡片鼠标光斑'],
        ['Typewriter', '打字机文案'],
        ['Counter', '数字滚动'],
        ['FAQ', '手风琴问答'],
        ['Aurora', '极光流动光斑背景'],
        ['PulseDot', '呼吸状态点'],
        ['SiteUptime', '实时时钟 + 站点运行秒表'],
        ['BackToTop', '返回顶部浮动按钮'],
      ],
      widths: [3200, 6400] })
    ,
    h.h2('7.2 全站常驻动效'),
    h.p('header-flow（导航栏下方流动渐变光线，每页可见）、hero 代码窗口 spin-border 旋转渐变描边、float-chip 漂浮符号、面板 panel-strip 流动顶条。全部动画遵守 prefers-reduced-motion 降级。'),
    h.h2('7.3 探照灯的两次重大修复（教训）'),
    h.p('第一次修复：旋转虚线环的 CSS 旋转动画会覆盖 Tailwind 的 translate 位移，导致光环错位。第二次修复：位置插值平滑导致透镜跟不上鼠标。最终实现为：单一容器 transform 承载位移与缩放，子元素零 transform，位置零延迟直跟鼠标，仅缩放与空闲游走保留弹簧插值。任何"同元素既有动画 transform 又有定位 transform"的写法都会复发错位，必须避免。'),
  ];
}

// 第八章 数据库设计
function chapter8() {
  return [
    h.h1('第八章 数据库设计（Supabase）'),
    h.h2('8.1 表清单'),
    h.table({ header: ['表', '用途', '关键约束'], rows:
      [
        ['profiles', '用户资料与角色', 'role=admin 仅负责人'],
        ['issues', '期刊内容与开通状态', '按 product_slug 组织'],
        ['purchases', '购买申请与核验', 'pending→confirmed 触发开通'],
        ['announcements', '平台公告', '公开读，管理员写'],
        ['inquiries', '咨询与选购申请', '用户提交，管理员回复'],
        ['assessments', '评估记录与雷达图数据', '每用户留存历史'],
        ['surveys', '问卷定义', 'slug 唯一，content jsonb'],
        ['survey_responses', '问卷答卷', 'unique(survey_id, user_id)'],
        ['forum_posts', '讨论区帖子', '公开读，登录写'],
        ['forum_comments', '讨论区评论', '公开读，登录写'],
      ],
      widths: [2400, 4200, 3000] })
    ,
    h.h2('8.2 行级安全（RLS）'),
    h.p('全部表启用 RLS。读策略：产品、公告、论坛公开读；答卷、评估、购买仅本人读（管理员全读）。写策略：业务表用户只能写本人数据；内容与管理类操作要求 is_admin()。survey_stats 视图用于管理员查看问卷回收数。'),
    h.h2('8.3 SQL 脚本清单'),
    h.bullet('supabase/schema.sql：基础表结构（首次建库执行）。'),
    h.bullet('supabase/fix-v*.sql：历次修复脚本（policy 冲突等，可重复执行）。'),
    h.bullet('supabase/surveys-forum.sql：问卷与论坛四表 + RLS + survey_stats 视图（v8 新增，需执行一次）。'),
    h.p('脚本均设计为可重复执行（drop policy if exists 前置）。执行入口：Supabase 控制台 SQL Editor。'),
    h.h2('8.4 Edge Functions'),
    h.p('supabase/functions/ 下为发信函数：调用 QQ 邮箱 SMTP（jiangtengqiao@qq.com，授权码存于 Function 环境变量）发送注册与重置验证码邮件。邮件模板极简风格但内容充实：验证码居中放大，上方为品牌声明，下方为广告位、网址跳转、联系方式与安全警告。'),
  ];
}

// 第九章 部署与运维
function chapter9() {
  return [
    h.h1('第九章 部署与运维'),
    h.h2('9.1 部署流程'),
    h.numbered('本地改动后执行 npm run build（tsc + vite build）验证通过；git commit 并 push 到 main；GitHub Actions 自动安装依赖、构建、发布到 GitHub Pages；约 2-3 分钟后线上生效。'),
    h.h2('9.2 验证方法'),
    h.p('部署后通过 curl 拉取 https://jiangtengqiao.github.io/seoc-studio/ 查看引用的 assets/index-*.js 哈希是否变化，再 grep 新版本的特征字符串（如功能关键词）确认生效。注意 CDN 与浏览器缓存，浏览器端验证需 Ctrl+F5 强制刷新。'),
    h.h2('9.3 已知运维事项'),
    h.bullet('SPA 路由：仓库部署了 404.html 回退机制，直接访问子路由不会 404。'),
    h.bullet('构建耗时约 2 分钟，产物主包约 760 kB（gzip 前），mammoth 为独立懒加载 chunk。'),
    h.bullet('构建有 chunk 500 kB 警告，属预期，可后续做 manualChunks 优化。'),
    h.bullet('Supabase 新加坡区域，国内访问速度可接受；如需更快可加 CDN。'),
  ];
}

// 第十章 内容生产工作流
function chapter10() {
  return [
    h.h1('第十章 内容生产工作流'),
    h.h2('10.1 大纲体系（v2）'),
    h.p('全部 20 个项目的学习资料大纲由 scripts/outline_data_1a/1b/2a/2b/3a/3b.py 六个结构化数据文件定义，经 scripts/gen_outline.py 渲染为《SEOC学习资料大纲与写作要求.md》（188 章/期，约 115 KB，存于工作区根目录，不上线）。统一四段进阶：起步篇（由简到易）→ 进阶篇（由易到难）→ 深入篇（由难到深）→ 探索篇（开放深入探索），每章 8 节，创作目标每章 40000-55000 字；官网公示字数（订阅 22000、专研 26000 起）是对消费者的最低承诺，两者关系已在大纲文档中写明。'),
    h.h2('10.2 章节数据格式'),
    h.p('大纲数据以元组列表描述：(章节名, 所属篇, [(小节, 写作要求)...], 交付要求)。gen_outline.py 负责篇分组、编号与字数表渲染。'),
    h.h2('10.3 正文入库流程'),
    h.p('其他智能体按大纲生成正文 Markdown 后，入库方式有两种：一，放入 src/content/issues/<产品slug>/ 目录，文件名即期号，重新构建部署；二，通过管理后台"期刊内容"标签在线发布（写 issues 表）。阅读器的大纲导航会自动从正文标题生成，无需额外配置。正文写作要求：每小点都要解释透彻，专业术语准确但讲解亲民，禁止大量破折号与大量冒号。'),
  ];
}

// 第十一章 开发约定与踩坑记录
function chapter11() {
  return [
    h.h1('第十一章 开发约定与踩坑记录（续作者必读）'),
    h.h2('11.1 文案风格铁律'),
    h.bullet('禁止大量使用破折号，禁止大量使用冒号；个别处允许少量使用。'),
    h.bullet('专业术语必须准确，但讲解要亲民；期刊论文类内容保持规范引用。'),
    h.bullet('去除一切 AI 腔：不写空泛总结，不堆砌套话。'),
    h.bullet('不使用 emoji（仅保留极个别既有符号如 💡 问卷附录标记）。'),
    h.h2('11.2 工程约定'),
    h.bullet('复杂多文件修改一律先写 scripts/patch-*.py 再用 python 执行，不要 heredoc 直接写大段代码（shell 会截断）。'),
    h.bullet('项目文件为 CRLF 行尾；patch 脚本需兼容两种行尾（先检测再替换）。'),
    h.bullet('Markdown 正文通过 import.meta.glob(?raw) 打包；新增 md 文件会被自动收编。'),
    h.bullet('数据层一律保持云端/本地双模（见 2.2）。'),
    h.bullet('构建必须本地跑通再推送：npm run build。'),
    h.bullet('不要提交 node_modules、dist、__pycache__（曾误提交 .pyc，已加 .gitignore）。'),
    h.h2('11.3 高频坑'),
    h.numbered('动画 transform 与定位 transform 冲突会导致元素错位（见 7.3）。'),
    h.numbered('渲染期自增计数器生成 DOM id 会在重渲染时漂移，导航类功能必须用确定性 id（同文本取模法）。'),
    h.numbered('ReactMarkdown 内部链接默认整页刷新且会破坏 SPA 基路径，需自定义 a 标签渲染为 React Router Link。'),
    h.numbered('GitHub Pages 部署有 2-5 分钟延迟与 CDN 缓存，验证前先确认资源哈希已变。'),
    h.numbered('i18n 批量注入时注意不同语言块存在相同译文（如 Forum），必须用该语言独有的锚点定位。'),
  ];
}

// 第十二章 待办与后续计划
function chapter12() {
  return [
    h.h1('第十二章 待办事项与后续计划'),
    h.h2('12.1 内容生产（最高优先级）'),
    h.bullet('按《SEOC学习资料大纲与写作要求.md》（188 章）批量生成正文并入库发布。'),
    h.bullet('七篇配套法律文本（免责声明、退款政策等）目前约 600-1000 字，如需可继续加厚。'),
    h.bullet('四篇主法律文本可按用户要求进一步补充至 8000-10000 字。'),
    h.h2('12.2 功能演进'),
    h.bullet('QQ/微信账号绑定（当前为占位）。'),
    h.bullet('主包 manualChunks 分包优化。'),
    h.bullet('评估题库可继续扩充并联网更新。'),
    h.bullet('问卷中心的自动化统计图表（当前为明细列表）。'),
    h.h2('12.3 版本历史速查'),
    h.table({ header: ['版本', '内容'], rows:
      [
        ['v6 及以前', '全站基础：产品、购买、评估、后台、法律、部署'],
        ['v7 / v7.1', '九语言、主题三态、阅读趣味交互、落地页扩充、阅读页导航'],
        ['v8', '问卷中心 + 用户讨论区'],
        ['v9 / v9.1', '折叠导航 mega menu、常驻动效、探照灯修复、双码支付'],
        ['v9.2', '菜单淡入淡出、代码窗口升级、支付锁定覆盖、法律文本大扩充'],
        ['v9.3', '支付码选中动效（本文档对应版本）'],
      ],
      widths: [2200, 7400] })
    ,
    h.spacer(300),
    h.p('交接说明完毕。后续智能体续作时，请先通读第三章（结构）、第五章（系统）、第十一章（约定与坑），再动代码。', { bold: true }),
  ];
}

h.build({
  sections: [
    { noPageNumber: true, children: coverSection() },
    { ...hf, children: tocSection() },
    { ...hf, children: [...chapter1(), ...chapter2(), ...chapter3(), ...chapter4(), ...chapter5(), ...chapter6(), ...chapter7(), ...chapter8(), ...chapter9(), ...chapter10(), ...chapter11(), ...chapter12()] },
  ],
}, [
  { type: 'coverColor', colors: ['1E3A8A', '3B6EF6'], direction: 'vertical' },
  { type: 'stripe', evenFill: 'F2F6FC', headerFill: '1E3A8A' },
]);
