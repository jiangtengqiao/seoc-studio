import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAnnouncements } from '../lib/content';
import { CATEGORY_META, CONTACT_EMAIL, type Announcement, type Category } from '../lib/types';
import { byCategory, EXPLORATION_BUNDLE_PRICE, PRODUCTS } from '../data/products';
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
    body: '六道题，两分钟。评估结果会告诉你处在起步、进阶还是高阶阶段，并给出对应的购买指引。评估完全免费，这是探索式项目的硬性前置。'
  },
  {
    stage: '第二步',
    title: '选定门类与项目',
    body: '打基础选订阅式，做项目选专研式，深入研究选探索式。每个产品页都公示完整目录、字数承诺与维护政策，所见即所得。'
  },
  {
    stage: '第三步',
    title: '邮件确认开通',
    body: '通过官方邮箱提交选购意向，人工核验后开通。我们不接第三方支付、不做促销，价格以官网公示为唯一标准。'
  },
  {
    stage: '第四步',
    title: '长期研读与答疑',
    body: '订阅式永久查阅并持续更新；专研式与探索式读者可进入学术交流群。所有异议均可投送电子邮件，我们书面回复。'
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
                Study and Explore of Coding · 编程研究与探索有限公司出品
              </p>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="text-4xl font-bold leading-[1.15] text-brand-950 sm:text-6xl">
                编程研究与探索
                <span className="mt-4 block min-h-10 text-xl font-semibold text-brand-600 sm:text-2xl">
                  <Typewriter
                    lines={[
                      'AI for everyone, coding for everyone.',
                      '研究的态度写教程，工程的标准做内容。',
                      'SEOC Studio，以 R 之名出品。'
                    ]}
                  />
                </span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
                我们把每一门编程语言当作值得认真对待的研究对象。起源要考据，语法要透彻，教程要成体系，
                期刊要有补丁意识。三大门类、二十个项目与子项目，为不同阶段的学习者提供从入门到高阶的完整路径。
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/auth/register" className="btn-primary !px-6 !py-3 !text-base shadow-lift">
                  免费注册，解锁试读
                </Link>
                <Link to="/products/subscription" className="btn-outline !px-6 !py-3 !text-base">
                  浏览全部内容
                </Link>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                注册后可试读各项目节选，开通后解锁对应全部正文与附赠资料。
              </p>
            </Reveal>
            <Reveal delay={400}>
              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                {[
                  { n: 3, s: '', t: '内容门类' },
                  { n: 20, s: '', t: '在售项目与子项目' },
                  { n: 40, s: '+', t: '计划连载期次' }
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
              <h2 className="mt-2 text-2xl font-bold text-brand-950">三大门类，三种读法</h2>
            </div>
            <Link to="/products" className="link-underline text-sm text-brand-600">查看全部项目</Link>
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
            <h2 className="mt-2 text-2xl font-bold text-brand-950">从评估到研读，四步走</h2>
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

      {/* 公告 + 承诺 */}
      <section className="container-x grid gap-6 py-8 lg:grid-cols-[1.3fr_1fr]">
        <Reveal>
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">最新公告</h2>
              <Link to="/announcements" className="link-underline text-xs text-brand-600">全部公告</Link>
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
            <h2 className="text-base font-semibold">我们的三条硬承诺</h2>
            <ul className="mt-4 space-y-4 text-sm leading-6 text-brand-100">
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-accent-400">01</span>
                不诱骗，不诱导。没有促销、没有倒计时、没有虚构原价，价格只在官网公示。
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-accent-400">02</span>
                字数写进规则。专研式每期不少于 5000 汉字，探索式各子项目的字数区间全部公示。
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 font-mono text-accent-400">03</span>
                异议必有回音。任何异议投送至 {CONTACT_EMAIL}，书面回复，不敷衍。
              </li>
            </ul>
            <Link to="/legal" className="btn mt-6 bg-white/10 text-white ring-1 ring-white/30 hover:bg-white/20">
              阅读全部协议与声明
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="container-x max-w-3xl py-16">
        <Reveal>
          <div className="mb-8 text-center">
            <p className="font-mono text-xs tracking-widest text-brand-500">FAQ</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-950">常被问到的问题</h2>
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
            <h2 className="relative text-2xl font-bold">准备好开始研究了吗</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-sm leading-7 text-brand-100">
              注册账户，完成免费评估，从适合你的门类开始。探索式项目总期刊包 {EXPLORATION_BUNDLE_PRICE} 元，
              仅限官网开放全期次选购。
            </p>
            <div className="relative mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/auth/register" className="btn bg-white px-6 py-3 font-medium text-brand-700 hover:bg-brand-50">
                免费注册
              </Link>
              <Link to="/assessment" className="btn px-6 py-3 text-white ring-1 ring-white/40 hover:bg-white/10">
                先做能力评估
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
