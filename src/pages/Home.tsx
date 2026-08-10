import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAnnouncements } from '../lib/content';
import { CATEGORY_META, CONTACT_EMAIL, type Announcement, type Category } from '../lib/types';
import { byCategory, EXPLORATION_BUNDLE_PRICE, PRODUCTS } from '../data/products';
import { BENEFIT_TIERS } from '../data/benefits';
import { useI18n } from '../lib/i18n';
import {
  Counter,
  FAQ,
  LensGate,
  Marquee,
  Reveal,
  Spotlight,
  TiltCard,
  Typewriter,
  useReveal
} from '../components/fx';
import { PriceTag } from '../components/ui';

const MARQUEE_ITEMS = [
  'Python 起源研究',
  'C++ 标准演进',
  '可训练 AI 从零实现',
  '出版级图表表达',
  '游戏开发五个梯度',
  '主流库全景',
  '爬虫热门探讨',
  '前后端开发',
  'AI 高阶应用',
  '中英双语教程'
];

const CODE_LINES: { html: string }[] = [
  { html: '<span class="tok-c"># SEOC Studio 出品 · 研究的态度，工程的标准</span>' },
  { html: '<span class="tok-k">class</span> <span class="tok-f">Learner</span>:' },
  { html: '    <span class="tok-k">def</span> <span class="tok-f">__init__</span>(self, curiosity):' },
  { html: '        self.curiosity = curiosity' },
  { html: '' },
  { html: '    <span class="tok-k">def</span> <span class="tok-f">explore</span>(self, journal):' },
  { html: '        <span class="tok-k">for</span> issue <span class="tok-k">in</span> journal:' },
  { html: '            self.curiosity *= issue.depth' },
  { html: '        <span class="tok-k">return</span> <span class="tok-s">"AI for everyone"</span>' }
];

const PATH_STEPS = [
  {
    stage: '第一步',
    title: '免费能力评估',
    body: '二十四道题，六大维度。评估结果会告诉你处在起步、进阶还是高阶阶段，并给出对应的购买指引。每日免费 2 次、每月免费 15 次，不提供付费加量。'
  },
  {
    stage: '第二步',
    title: '选定门类与项目',
    body: '打基础选订阅式，做项目选专研式，深入研究选探索式。每个产品页都公示完整目录、字数承诺与维护政策，所见即所得。'
  },
  {
    stage: '第三步',
    title: '站内支付与人工确认',
    body: '登录后打开购买面板，任选支付宝或微信收款码完成支付，再提交付款信息。人工核验通过后自动开通，价格以官网公示为唯一标准。'
  },
  {
    stage: '第四步',
    title: '长期研读与答疑',
    body: '订阅式永久查阅并持续更新；专研式与探索式读者可进入学术交流群。累计确认金额达到档位后，可获得学习档案、路径诊断、工程资料包与项目复盘。'
  }
];

const FAQS = [
  {
    q: '为什么要先注册登录才能阅读？',
    a: '平台全部正文内容仅对注册用户开放试读，正式内容对开通用户开放。账户体系用于核验已购权限、保存评估结果与发放附赠资料，这是数字内容交付的必要前提。'
  },
  {
    q: '价格会有优惠或活动吗？',
    a: '不会。本司不进行任何促销优惠活动，定价通过内容体量、维护成本与读者群体综合考量确定。凡与官网不一致的价格均属假冒，请通过官方邮箱举报，举报有奖。'
  },
  {
    q: '购买后可以退款吗？',
    a: '数字商品一律不支持退款，一经下单并支付即视为交易完成，并视为成年人的行为。支付前请充分利用免费评估与公示目录审慎决策。'
  },
  {
    q: '探索式项目的群怎么加入？',
    a: '购买任意探索式子项目后，可在 QQ 群与微信群中任选一个加入。入群资格与已购状态绑定，群内须遵守学术交流群社区规范。'
  },
  {
    q: '持续维护和持续更新有什么区别？',
    a: '维护指对已发布内容的纠错与修复，更新指新增章节或期次。订阅式项目两者皆有；专研式持续维护但不持续更新；探索式按期刊计划连载并附补丁。'
  },
  {
    q: '内容版权归谁，我能转载吗？',
    a: '全部原创内容版权归编程研究与探索有限公司所有。购入获得的是个人学习使用许可，不得转载、转售或上传至任何公开渠道。'
  },
  {
    q: '每篇内容大概多少字？',
    a: '订阅式每章不少于 22000 汉字，专研式每期不少于 26000 汉字，探索式每期 22000 至 30000 汉字。字数承诺写进用户服务协议与维护政策，低于承诺可按协议约定处理。'
  },
  {
    q: '能力评估怎么收费，次数有限制吗？',
    a: '评估完全免费，每日 2 次、每月 15 次，由系统与数据库双重校验。平台不提供付费加量，任何声称可以购买评估次数的渠道均属假冒。'
  },
  {
    q: '支付后多久能开通？',
    a: '平台采用扫码支付加人工核验的方式。提交付款信息后一般在 24 小时内完成确认并开通，开通结果会展示在用户中心。超过 48 小时未开通请邮件联系并附上付款凭证。'
  },
  {
    q: '网站支持哪些语言和主题？',
    a: '界面支持简体中文、繁体中文、英语、日语、韩语、法语、德语、西班牙语、俄语九种语言，正文内容以中文为主。主题支持浅色、深色与跟随系统三种模式，均可在页面右上角一键切换。'
  }
];

function HeroCodeWindow() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= CODE_LINES.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 600 : 240);
    return () => clearTimeout(t);
  }, [shown]);
  return (
    <div className="code-window float-slow relative rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-red-400/80" />
        <span className="h-3 w-3 rounded-full bg-accent-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <span className="ml-3 font-mono text-xs text-brand-300">learner.py</span>
      </div>
      <pre className="min-h-56 font-mono text-[13px] leading-6 text-slate-200">
        {CODE_LINES.slice(0, shown).map((l, i) => (
          <div key={i} dangerouslySetInnerHTML={{ __html: l.html || '&nbsp;' }} />
        ))}
      </pre>
      <span className="absolute -right-3 -top-3 rounded-full bg-accent-500 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-white shadow-lift">
        SEOC
      </span>
    </div>
  );
}

export default function Home() {
  const { t } = useI18n();
  const [anns, setAnns] = useState<Announcement[]>([]);
  const rootRef = useReveal<HTMLDivElement>();
  const excerptProduct = PRODUCTS.find((p) => p.slug === 'python-origin')!;

  useEffect(() => {
    fetchAnnouncements().then((a) => setAnns(a.slice(0, 3)));
  }, []);

  return (
    <div ref={rootRef}>
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden border-b border-slate-200">
        <div className="mesh-orb left-[8%] top-[10%] h-72 w-72 bg-brand-300/40" />
        <div className="mesh-orb right-[6%] top-[30%] h-80 w-80 bg-accent-400/25" style={{ animationDelay: '-6s' }} />
        <div className="mesh-orb bottom-[0%] left-[40%] h-64 w-64 bg-brand-400/25" style={{ animationDelay: '-3s' }} />
        <div className="container-x relative grid gap-12 py-16 md:grid-cols-[1.15fr_1fr] md:py-24">
          <div>
            <Reveal>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-medium text-brand-700 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {t('hero.badge')}
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="text-4xl font-bold leading-[1.15] text-brand-950 sm:text-6xl">
                {t('hero.title')}
                <span className="mt-4 block min-h-10 text-xl font-semibold text-brand-600 sm:text-2xl">
                  <Typewriter lines={[t('hero.line1'), t('hero.line2'), t('hero.line3')]} />
                </span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">{t('hero.body')}</p>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth/register" className="btn-primary !px-6 !py-3 !text-base shadow-lift">
                  {t('hero.cta1')}
                </Link>
                <Link to="/products/subscription" className="btn-outline !px-6 !py-3 !text-base">
                  {t('hero.cta2')}
                </Link>
              </div>
              <p className="mt-3 text-xs text-slate-500">{t('hero.note')}</p>
            </Reveal>
            <Reveal delay={400}>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                {[
                  { n: 3, s: '', t: t('hero.stat1') },
                  { n: 20, s: '', t: t('hero.stat2') },
                  { n: 100, s: '+', t: t('hero.stat3') }
                ].map((d) => (
                  <Spotlight key={d.t} className="card p-4 text-center">
                    <dt className="text-2xl font-bold text-brand-700">
                      <Counter to={d.n} suffix={d.s} />
                    </dt>
                    <dd className="mt-1 text-xs text-slate-500">{d.t}</dd>
                  </Spotlight>
                ))}
              </dl>
            </Reveal>
          </div>
          <Reveal delay={250} className="self-center">
            <TiltCard max={6}>
              <HeroCodeWindow />
            </TiltCard>
          </Reveal>
        </div>
      </section>

      <Marquee items={MARQUEE_ITEMS} />

      {/* 探照灯试读 */}
      <section className="container-x py-16">
        <Reveal>
          <div className="mb-8 max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-brand-500">LENS PREVIEW</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-950">把光移到锁上，看看里面写了什么</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              付费内容的诚意应该经得起检验。下方是《{excerptProduct.title}》的真实正文节选，
              表层是锁定状态，鼠标所及之处即为试读。这正是本平台交付内容的方式，开通前看得见的质量。
            </p>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <LensGate
            title="《Python 的起源研究与探索》第一章节选"
            className="h-96 rounded-2xl border border-slate-200 shadow-card"
            excerpt={
              '要理解 Python 为什么长成今天的样子，必须回到它诞生之前的两个背景。一个是荷兰数学与计算机科学研究中心的 ABC 语言项目，另一个是同一机构内开展的 Amoeba 分布式操作系统研究。Guido van Rossum 恰好同时身处这两个项目之中。\n\nABC 的设计者相信，语言的学习曲线本身就是一门科学问题。它没有类型声明，缩进即代码块，字符串与列表的操作直观而统一。Python 今天用缩进表达代码块，用高层数据结构作为语言的一等公民，这些决定几乎全部可以在 ABC 中找到先例。\n\nABC 的失败同样重要。它封闭、不可扩展、无法与系统对话，只能在课堂里存活。这个教训直接塑造了 Python 的架构方向，从一开始就把自己定位为一门可以嵌入系统、可以被 C 扩展的胶水语言。'
            }
            cta={
              <Link to={`/product/${excerptProduct.slug}`} className="btn mt-2 bg-white text-brand-800 hover:bg-brand-50">
                查看完整目录与定价
              </Link>
            }
          />
        </Reveal>
      </section>

      {/* 三大门类 */}
      <section className="container-x py-8">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs tracking-widest text-brand-500">COLLECTIONS</p>
              <h2 className="mt-2 text-2xl font-bold text-brand-950">{t('home.collections')}</h2>
            </div>
            <Link to="/products" className="link-underline text-sm text-brand-600">{t('home.viewAll')}</Link>
          </div>
        </Reveal>
        <div className="grid gap-5 lg:grid-cols-3">
          {(Object.keys(CATEGORY_META) as Category[]).map((cat, i) => {
            const meta = CATEGORY_META[cat];
            const items = byCategory(cat);
            const first = items[0];
            return (
              <Reveal key={cat} delay={i * 120}>
                <TiltCard max={5} className="h-full">
                  <Spotlight className="card flex h-full flex-col p-6">
                    <p className="font-mono text-xs text-brand-500">{meta.nameEn}</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">{meta.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{meta.tone}</p>
                    <div className="my-4 rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-400">代表项目</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">{first.title}</p>
                      <div className="mt-2">
                        <PriceTag price={first.price} unit={first.unit} />
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs text-slate-400">{items.length} 个项目</span>
                      <Link to={meta.path} className="btn-outline !py-1.5 !text-xs">进入门类</Link>
                    </div>
                  </Spotlight>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* 学习路径时间线 */}
      <section className="container-x py-16">
        <Reveal>
          <div className="mb-10 max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-brand-500">HOW IT WORKS</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-950">{t('home.howItWorks')}</h2>
          </div>
        </Reveal>
        <div className="relative">
          <div className="absolute left-4 top-0 h-full w-px bg-gradient-to-b from-brand-300 via-brand-200 to-transparent md:left-1/2" />
          <div className="space-y-10">
            {PATH_STEPS.map((s, i) => (
              <Reveal key={s.stage} delay={i * 100}>
                <div className={`relative flex gap-6 pl-12 md:w-1/2 ${i % 2 ? 'md:ml-auto md:pl-12' : 'md:pr-12 md:pl-0 md:text-right md:flex-row-reverse'}`}>
                  <span className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-400 bg-white font-mono text-xs font-bold text-brand-600 md:left-auto md:right-0 md:translate-x-1/2 md:[.md\:ml-auto_&]:left-0 md:[.md\:ml-auto_&]:-translate-x-1/2">
                    {i + 1}
                  </span>
                  <div className="card flex-1 p-5">
                    <p className="font-mono text-xs text-accent-600">{s.stage}</p>
                    <h3 className="mt-1 font-semibold text-slate-900">{s.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{s.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 累计支持回馈 */}
      <section className="container-x py-16">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs tracking-widest text-brand-500">READER BENEFITS</p>
              <h2 className="mt-2 text-2xl font-bold text-brand-950">{t('home.benefits')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                回馈按已确认开通金额累计，不给空头衔。每一档都对应可下载资料或可提交的真实服务。
              </p>
            </div>
            <Link to="/account" className="link-underline text-sm text-brand-600">{t('home.myBenefits')}</Link>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BENEFIT_TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 100}>
              <div className="card flex h-full flex-col p-5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{tier.name}</p>
                  <span className="badge bg-brand-50 text-brand-700">¥{tier.threshold}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tier.summary}</p>
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">{tier.deliverable}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 内容体量总览 */}
      <section className="container-x py-12">
        <Reveal>
          <div className="card grid gap-6 p-8 text-center sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '102', u: '章 / 期', d: '全平台规划内容总量，目录逐期公示' },
              { n: '22000', u: '+ 字', d: '单篇正文最低字数，写进协议承诺' },
              { n: '150', u: ' 题', d: '能力评估题库，六大维度动态抽题' },
              { n: '9', u: ' 种', d: '界面语言，主题支持浅色深色与跟随系统' }
            ].map((d) => (
              <div key={d.d}>
                <p className="text-3xl font-bold text-brand-700">
                  {d.n}
                  <span className="text-base font-medium text-slate-500">{d.u}</span>
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{d.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* 谁适合读我们 */}
      <section className="container-x py-12">
        <Reveal>
          <div className="mb-8 max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-brand-500">WHO IT IS FOR</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-950">谁适合读我们的内容</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              我们不承诺速成，也不迎合所有人。以下四类读者，通常能在这里获得超出预期的收获。
            </p>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { tag: '在校学生', d: '需要把课堂之外的语法细节、工程习惯与项目经验补齐的人。订阅式项目提供完整的基础读物，评估帮助你定位当前阶段。' },
            { tag: '转行学习者', d: '面对海量资料不知从何入手的人。先做免费评估，再按指引选择门类，用成体系的内容替代碎片式搜索。' },
            { tag: '在职工程师', d: '想系统补足某一领域的人。专研式系列教程以真实项目驱动，附赠资料可直接套用到工作流中。' },
            { tag: '高阶研究者', d: '追求深度与前沿讨论的人。探索式期刊面向高阶学者，附补丁机制与学术交流群，持续追踪关键问题。' }
          ].map((it, i) => (
            <Reveal key={it.tag} delay={i * 100}>
              <Spotlight className="card h-full p-5">
                <p className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">{it.tag}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{it.d}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 站内功能导览 */}
      <section className="container-x py-12">
        <Reveal>
          <div className="mb-8 max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-brand-500">SITE MAP</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-950">站内功能导览</h2>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { to: '/assessment', t1: '免费能力评估', d: '每次动态抽取 24 题，六维雷达图实时生成，历史记录与答题详情长期留存。' },
            { to: '/community', t1: '学术交流社群', d: '探索式项目读者可在 QQ 群与微信群中任选一个加入，群内以学术交流为主题。' },
            { to: '/search', t1: '全站搜索', d: '跨项目检索目录、公告与协议条款，快速定位你想了解的内容。' },
            { to: '/announcements', t1: '平台公告', d: '新期发布、维护安排与政策变更都会以公告形式公示，置顶公告长期可见。' },
            { to: '/account', t1: '用户中心', d: '查看已购项目、待确认订单、累计回馈进度与评估历史，下载属于你的学习档案。' },
            { to: '/legal', t1: '协议与声明', d: '用户服务协议、购买协议、隐私政策、反假冒声明与维护政策，全部公开可查。' }
          ].map((it, i) => (
            <Reveal key={it.to} delay={i * 80}>
              <Link to={it.to} className="card group block h-full p-5 transition hover:border-brand-400">
                <p className="font-semibold text-slate-900 group-hover:text-brand-700">{it.t1}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{it.d}</p>
                <p className="mt-3 text-xs font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">进入 →</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 版权保护说明 */}
      <section className="container-x py-12">
        <Reveal>
          <div className="card overflow-hidden lg:grid lg:grid-cols-[1fr_1.2fr]">
            <div className="bg-gradient-to-br from-brand-800 to-brand-950 p-8 text-white">
              <p className="font-mono text-xs tracking-widest text-accent-400">COPYRIGHT PROTECTION</p>
              <h2 className="mt-2 text-xl font-bold">内容保护机制，公开讲清楚</h2>
              <p className="mt-4 text-sm leading-7 text-brand-100">
                每一篇正文都对应真实的研究与写作成本。平台在网页技术允许的范围内部署了多层防护，
                目的是保护已购读者与平台的共同权益，让持续产出高质量内容这件事可以长期成立。
              </p>
            </div>
            <ul className="space-y-4 p-8 text-sm leading-6 text-slate-600">
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-brand-500">01</span>
                正文区域覆盖动态溯源水印，水印包含账户标识并持续移动，任何截图都能追溯到具体账户。
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-brand-500">02</span>
                阅读期间对键盘活动、页面失焦、打印指令与截屏快捷键保持实时监测，检测到异常立即遮蔽内容，行为结束后自动恢复。
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-brand-500">03</span>
                剪贴板写入受控，正文不可整段复制；用户服务协议明确禁止转载、转售与传播，违约将追究责任。
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-brand-500">04</span>
                正版只有官网一个渠道。发现假冒售价或盗卖内容请发送邮件举报，核实后有奖励。
              </li>
            </ul>
          </div>
        </Reveal>
      </section>

      {/* 联系与异议通道 */}
      <section className="container-x py-12">
        <Reveal>
          <div className="card grid gap-6 p-8 md:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">异议与咨询</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                对内容、定价或订单有任何异议，投送至
                <a className="text-brand-600 hover:underline" href="mailto:jiangtengqiao@qq.com"> jiangtengqiao@qq.com</a>，
                负责人 JTQ 书面回复。
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">举报假冒</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                官网价格全网唯一。凡出现与官网不一致的售价或打着 SEOC Studio 名义的收费渠道，请附带证据邮件举报，核实后有奖。
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">开通进度</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                付款信息提交后请在用户中心查看状态。一般 24 小时内完成人工核验，超过 48 小时未开通请附付款凭证邮件联系。
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 公告 + 承诺 */}
      <section className="container-x grid gap-6 py-8 lg:grid-cols-[1.3fr_1fr]">
        <Reveal>
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">{t('home.latestAnn')}</h2>
              <Link to="/announcements" className="link-underline text-xs text-brand-600">{t('home.allAnn')}</Link>
            </div>
            <ul className="space-y-4">
              {anns.map((a) => (
                <li key={a.id} className="border-b border-slate-100 pb-4 last:border-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    {a.pinned && <span className="badge bg-accent-400/20 text-accent-600">置顶</span>}
                    {a.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{a.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="card h-full bg-gradient-to-br from-brand-700 to-brand-950 p-6 text-white">
            <h2 className="text-base font-semibold">{t('home.promises')}</h2>
            <ul className="mt-4 space-y-4 text-sm leading-6 text-brand-100">
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-accent-400">01</span>
                不诱骗，不诱导。没有促销、没有倒计时、没有虚构原价，价格只在官网公示。
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-accent-400">02</span>
                字数写进规则。订阅式每章不少于 22000 汉字，专研式每期不少于 26000 汉字，探索式每期 22000 至 30000 汉字，承诺全部公示。
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-accent-400">03</span>
                异议必有回音。任何异议投送至 {CONTACT_EMAIL}，书面回复，不敷衍。
              </li>
            </ul>
            <Link to="/legal" className="btn mt-6 bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20">
              {t('home.readLegal')}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="container-x max-w-3xl py-16">
        <Reveal>
          <div className="mb-8 text-center">
            <p className="font-mono text-xs tracking-widest text-brand-500">FAQ</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-950">{t('home.faq')}</h2>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <FAQ items={FAQS} />
        </Reveal>
      </section>

      {/* 底部 CTA */}
      <section className="container-x pb-20">
        <Reveal>
          <div className="card relative overflow-hidden bg-gradient-to-r from-brand-600 to-brand-900 p-10 text-center text-white">
            <div className="mesh-orb -left-10 -top-10 h-56 w-56 bg-accent-400/30" />
            <h2 className="relative text-2xl font-bold">{t('home.ctaTitle')}</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-sm leading-7 text-brand-100">
              注册账户，完成免费评估，从适合你的门类开始。探索式项目总期刊包 {EXPLORATION_BUNDLE_PRICE} 元，
              仅限官网开放全期次选购。
            </p>
            <div className="relative mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/auth/register" className="btn bg-white px-6 py-3 font-medium text-brand-700 hover:bg-brand-50">
                {t('home.ctaRegister')}
              </Link>
              <Link to="/assessment" className="btn px-6 py-3 text-white ring-1 ring-white/40 hover:bg-white/10">
                {t('home.ctaAssess')}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
