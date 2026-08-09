# SEOC Studio 官网与期刊平台 — 项目计划

## 一、需求摘要
- 公司：编程研究与探索（Study and Explore of Coding），品牌签名缩写 **SEOC Studio**（R 型标识，SEOC 大写），有限公司出品
- 负责人：JTQ；联系邮箱：jiangtengqiao@qq.com
- 定位：编程起源研究、使用指南、专研教程、探索式期刊的数字内容平台
- 理念：AI (artificial intelligence) for everyone, coding 赋能 everyone，多元化内容 unique activities

## 二、已确认决策
| 决策项 | 结论 |
|---|---|
| 架构/托管 | Supabase（认证+数据库+存储）+ Cloudflare Pages（前端托管），均免费档 |
| 支付/绑定 | 仅展示价格与联系方式（邮箱 + QQ/微信群人工对接）；QQ/微信绑定为界面占位，预留 OAuth 接口 |
| 内容范围 | 全部内容一次性写完（分多轮持续产出，先框架与法律文本，再逐门类补全教程与期刊全文及附赠资料） |
| 视觉风格 | 明亮现代科技风（白底 + 品牌色渐变，SaaS 官网气质） |

## 三、原型与技术栈
- 原型：fullstack（前后端分离形态交付）
  - 前端：Vite + React 18 + TypeScript + Tailwind CSS + React Router v7 + supabase-js
  - 后端：Supabase（Auth、Postgres、Storage、Row Level Security）
- 部署：Cloudflare Pages（前端）+ Supabase Cloud（后端）
- 内容形态：教程/期刊以 Markdown 存数据库，附赠资料存 Storage，管理端在线发布

## 四、产品数据模型（已核对）
### 门类一 订阅式项目（一次性购入，永久查阅，持续维护和更新）
1. Python 的起源研究与探索 — 40 元
2. C++ 的起源研究与探索 — 42 元
3. Python 使用指南 — 75 元（含编辑器、语法指导与详情等）
4. C++ 使用指南 — 78 元（内容构成同上）

### 门类二 专研式项目（分期，每期正文 >5000 汉字；持续维护但不持续更新；附赠资料；异议请投送电子邮件）
1. Python 自行制作可训练人工智能 AI 系列教程（中英双语）— 428 元，赠资料
2. Python 图表的高级制作与表达系列教程（仅中文）— 188 元，赠资料
3. Python 游戏制作简单教程 入门级 — 29.9 元（仅简单教程，不赠资料）
4. 中级 — 43.9 元，赠资料
5. 高级 — 82.8 元，赠资料
6. 大师级 — 141.83 元，赠资料
7. 顶级（259.8 元），赠资料
8. 超越游戏的存在 尊享级 — 398.8 元，赠资料（较复杂项目）

### 门类三 探索式项目（高阶学者向，初学者慎入；QQ/微信群学术交流；最低购入 >=3 个子项目；总期刊包 1313 元）
1. Python 主流库与对应应用 — 145 元 / 7 期
2. Python 爬虫热门探讨 — 150 元 / 5 期
3. Python 前端开发 — 99 元 / 5 期
4. Python 后端开发（庞大量内容）— 298 元 / 5 期
5. Python Web 领域 — 128 元 / 3 期
6. Python Application 开发 — 138 元 / 3 期
7. Python 在 AI 中的应用 — 188 元 / 2 期
8. Python 带 AI 高阶应用 — 288 元 / 2 期（每期 1 至 3 个补丁）

### 详情补丁
- 子项目 1-4：每期字数 <=5000；子项目 5-8：每期字数 3000-13000 且含补丁
- 购买任意项目可任选一个交流群（QQ 群或微信群）
- 购买前免费能力评估，给出评估结果与购买指引
### 购买补丁
- 数字商品一经下单支付概不退款，下单即视为成年人，本司不承担相关责任
- 不诱骗、不诱导消费；无任何促销优惠；谨防假冒定价，举报有奖
### 特别补丁
- 探索门类全期次选购仅限官网开放；子项目逐期购入，专题连载完结后可总包购入

## 五、路由表
| 路由 | 页面 | 状态 |
|---|---|---|
| / | 首页（品牌、理念、三门类导览、公告） | ⬜ |
| /products | 全部产品总览 | ⬜ |
| /products/subscription | 门类一 订阅式 | ⬜ |
| /products/specialized | 门类二 专研式 | ⬜ |
| /products/exploration | 门类三 探索式 | ⬜ |
| /product/:slug | 产品详情（目录、试读、购买指引） | ⬜ |
| /reader/:slug/:issue | 在线阅读器（登录+已购校验） | ⬜ |
| /assessment | 免费能力评估 | ⬜ |
| /announcements | 公告列表 | ⬜ |
| /legal/:doc | 法律文本（用户协议/购买协议/隐私政策/免责声明/知识产权/社区规范/未成年人声明/退款政策等） | ⬜ |
| /auth/login /auth/register /auth/reset | 登录/注册/忘记密码 | ⬜ |
| /account | 用户中心（资料、已购、绑定 QQ/微信占位、多账户联动） | ⬜ |
| /admin | 管理端（内容上传、期刊发布、公告、用户邮箱列表） | ⬜ |

## 六、数据库设计（Supabase）
- profiles(id, email, nickname, role, qq_bound, wechat_bound, linked_accounts jsonb, created_at)
- products(slug, category, title, price, issues_total, perks, description, toc jsonb, status)
- issues(id, product_slug, issue_no, title, lang, word_count, content_md, patches jsonb, published_at)
- materials(id, product_slug, title, file_path, size)
- purchases(id, user_id, product_slug, issue_range, status, note, created_at)（人工确认制）
- announcements(id, title, body, published_at, pinned)
- assessments(id, user_id, answers jsonb, result jsonb, created_at)

## 七、内容产出清单（多轮交付）
- [x] 法律文本全套初版（11 篇，后续轮次扩充至完整深度）
- [ ] 门类一：4 部产品全文
- [ ] 门类二：8 个项目全期全文 + 附赠资料
- [ ] 门类三：8 个子项目全期全文 + 补丁
- [ ] 能力评估题库与评估逻辑
- [ ] 部署与运维手册（Cloudflare Pages + Supabase 配置步骤）

## 八、当前进度
- Phase 1-5 完成：脚手架、全局样式、布局、全部路由页面、构建通过、开发服务器验证通过（首页/协议页/评估页/产品页渲染正常）
- [x] 法律文本 11 篇初版（terms/purchase/privacy/disclaimer/ip/refund/community/minor/maintenance/materials/anti-fraud）
- [x] 产品目录数据源（20 个项目/子项目，价格与规则已核对）
- [x] 连载管线打通：python-origin--1、python-guide--1 样章已入库
- [x] 部署手册 docs/DEPLOYMENT.md
- [x] 门类一 python-origin 全 6 章完成
- [x] v2 大升级（2026-08-09 下午）：动效系统（reveal/打字机/计数器/走马灯/倾斜卡/聚光灯/滚动进度/FAQ 手风琴）、RevealLens 探照灯交互（首页 + 产品详情 LensGate 试读）、强制登录门槛（阅读器/用户中心/管理端/评估提交/选购动作）、首期试读模式、全站搜索页、学术社群页、GitHub Actions 自动部署工作流 + scripts/deploy.sh 一键部署
- 下一轮：内容批次二（cpp-origin 全 6 章），法律文本扩充，使用指南续章
