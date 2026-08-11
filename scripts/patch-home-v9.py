import io

p = 'src/pages/Home.tsx'
s = io.open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'

def rep(old, new):
    global s
    o = old.replace('\n', nl)
    n = new.replace('\n', nl)
    assert o in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(o, n, 1)

# 1. 导入新组件
rep("""import {
  Counter,
  FAQ,
  LensGate,
  Marquee,
  Reveal,
  Spotlight,
  TiltCard,
  Typewriter,
  useReveal
} from '../components/fx';""",
"""import {
  Aurora,
  Counter,
  FAQ,
  LensGate,
  Marquee,
  PulseDot,
  Reveal,
  Spotlight,
  TiltCard,
  Typewriter,
  useReveal
} from '../components/fx';""")

# 2. 内容体量总览：数字滚动 + 极光背景
rep("""      {/* 内容体量总览 */}
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
      </section>""",
"""      {/* 内容体量总览 */}
      <section className="container-x py-12">
        <Reveal>
          <div className="card relative grid gap-6 overflow-hidden p-8 text-center sm:grid-cols-2 lg:grid-cols-4">
            <Aurora className="-left-16 -top-20" color="rgba(59,110,246,0.22)" size={260} />
            <Aurora className="-bottom-24 -right-10" color="rgba(245,158,11,0.18)" size={300} delay={-5} />
            {[
              { n: 102, u: ' 章 / 期', d: '全平台规划内容总量，目录逐期公示' },
              { n: 22000, u: '+ 字', d: '单篇正文最低字数，写进协议承诺' },
              { n: 150, u: ' 题', d: '能力评估题库，六大维度动态抽题' },
              { n: 9, u: ' 种', d: '界面语言，主题支持浅色深色与跟随系统' }
            ].map((d) => (
              <div key={d.d} className="relative">
                <p className="text-3xl font-bold text-brand-700">
                  <Counter to={d.n} />
                  <span className="text-base font-medium text-slate-500">{d.u}</span>
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{d.d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>""")

# 3. 站内功能导览：呼吸点 + 实时感提示
rep("""          <div className="mb-8 max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-brand-500">SITE MAP</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-950">站内功能导览</h2>
          </div>""",
"""          <div className="mb-8 max-w-2xl">
            <p className="font-mono text-xs tracking-widest text-brand-500">SITE MAP</p>
            <h2 className="mt-2 flex items-center gap-2.5 text-2xl font-bold text-brand-950">
              站内功能导览
              <PulseDot />
            </h2>
            <p className="mt-2 text-sm text-slate-500">问卷中心与讨论区已上线，更多功能持续迭代中。</p>
          </div>""")

# 4. 功能导览卡片加入问卷中心与讨论区
rep("""          {[
            { to: '/assessment', t1: '免费能力评估', d: '每次动态抽取 24 题，六维雷达图实时生成，历史记录与答题详情长期留存。' },""",
"""          {[
            { to: '/assessment', t1: '免费能力评估', d: '每次动态抽取 24 题，六维雷达图实时生成，历史记录与答题详情长期留存。' },
            { to: '/surveys', t1: '问卷中心', d: '参与用户体验深度调研，您的每一个选项都会直接驱动产品迭代优先级。' },
            { to: '/forum', t1: '用户讨论区', d: '发帖分享心得、提出建议、反馈问题，与同频学习者交流碰撞。' },""")

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('Home.tsx patched')
