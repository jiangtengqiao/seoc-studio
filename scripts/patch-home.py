# -*- coding: utf-8 -*-
p = 'src/pages/Home.tsx'
s = open(p, encoding='utf-8').read()

# 1. 引入 useI18n
s = s.replace("import { BENEFIT_TIERS } from '../data/benefits';",
              "import { BENEFIT_TIERS } from '../data/benefits';\nimport { useI18n } from '../lib/i18n';")

# 2. 组件内取 t
s = s.replace("""export default function Home() {
  const [anns, setAnns] = useState<Announcement[]>([]);""",
"""export default function Home() {
  const { t } = useI18n();
  const [anns, setAnns] = useState<Announcement[]>([]);""")

# 3. 去掉重复的"累计支持回馈"区块（保留第一次出现）
block_start = '      {/* 累计支持回馈 */}'
first = s.find(block_start)
second = s.find(block_start, first + 1)
assert first != -1 and second != -1, 'no dup found'
end_marker = '      {/* 公告 + 承诺 */}'
end = s.find(end_marker, second)
assert end != -1
s = s[:second] + s[end:]

# 4. Hero 多语言化
s = s.replace("Study and Explore of Coding · 编程研究与探索有限公司出品\n", "{t('hero.badge')}\n")
s = s.replace("""              <h1 className="text-4xl font-bold leading-[1.15] text-brand-950 sm:text-6xl">
                编程研究与探索""",
"""              <h1 className="text-4xl font-bold leading-[1.15] text-brand-950 sm:text-6xl">
                {t('hero.title')}""")
s = s.replace("""                  <Typewriter
                    lines={[
                      'AI for everyone, coding for everyone.',
                      '研究的态度写教程，工程的标准做内容。',
                      'SEOC Studio，以 R 之名出品。'
                    ]}
                  />""",
"""                  <Typewriter lines={[t('hero.line1'), t('hero.line2'), t('hero.line3')]} />""")
s = s.replace("""              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
                我们把每一门编程语言当作值得认真对待的研究对象。起源要考据，语法要透彻，教程要成体系，
                期刊要有补丁意识。三大门类、二十个项目与子项目，为不同阶段的学习者提供从入门到高阶的完整路径。
              </p>""",
"""              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">{t('hero.body')}</p>""")
s = s.replace("""                <Link to="/auth/register" className="btn-primary !px-6 !py-3 !text-base shadow-lift">
                  免费注册，解锁试读
                </Link>
                <Link to="/products/subscription" className="btn-outline !px-6 !py-3 !text-base">
                  浏览全部内容
                </Link>""",
"""                <Link to="/auth/register" className="btn-primary !px-6 !py-3 !text-base shadow-lift">
                  {t('hero.cta1')}
                </Link>
                <Link to="/products/subscription" className="btn-outline !px-6 !py-3 !text-base">
                  {t('hero.cta2')}
                </Link>""")
s = s.replace("""              <p className="mt-3 text-xs text-slate-500">
                注册后可试读各项目节选，开通后解锁对应全部正文与附赠资料。
              </p>""",
"""              <p className="mt-3 text-xs text-slate-500">{t('hero.note')}</p>""")
s = s.replace("""                {[
                  { n: 3, s: '', t: '内容门类' },
                  { n: 20, s: '', t: '在售项目与子项目' },
                  { n: 40, s: '+', t: '计划连载期次' }
                ].map((d) => (""",
"""                {[
                  { n: 3, s: '', t: t('hero.stat1') },
                  { n: 20, s: '', t: t('hero.stat2') },
                  { n: 100, s: '+', t: t('hero.stat3') }
                ].map((d) => (""")

# 5. 各区块标题多语言化
pairs = [
 ('<h2 className="mt-2 text-2xl font-bold text-brand-950">三大门类，三种读法</h2>',
  '<h2 className="mt-2 text-2xl font-bold text-brand-950">{t(\'home.collections\')}</h2>'),
 ('<Link to="/products" className="link-underline text-sm text-brand-600">查看全部项目</Link>',
  '<Link to="/products" className="link-underline text-sm text-brand-600">{t(\'home.viewAll\')}</Link>'),
 ('<h2 className="mt-2 text-2xl font-bold text-brand-950">从评估到研读，四步走</h2>',
  '<h2 className="mt-2 text-2xl font-bold text-brand-950">{t(\'home.howItWorks\')}</h2>'),
 ('<h2 className="mt-2 text-2xl font-bold text-brand-950">累计支持回馈，全部是实质交付</h2>',
  '<h2 className="mt-2 text-2xl font-bold text-brand-950">{t(\'home.benefits\')}</h2>'),
 ('<Link to="/account" className="link-underline text-sm text-brand-600">查看我的回馈</Link>',
  '<Link to="/account" className="link-underline text-sm text-brand-600">{t(\'home.myBenefits\')}</Link>'),
 ('<h2 className="text-base font-semibold text-slate-900">最新公告</h2>',
  '<h2 className="text-base font-semibold text-slate-900">{t(\'home.latestAnn\')}</h2>'),
 ('<Link to="/announcements" className="link-underline text-xs text-brand-600">全部公告</Link>',
  '<Link to="/announcements" className="link-underline text-xs text-brand-600">{t(\'home.allAnn\')}</Link>'),
 ('<h2 className="text-base font-semibold">我们的三条硬承诺</h2>',
  '<h2 className="text-base font-semibold">{t(\'home.promises\')}</h2>'),
 ('阅读全部协议与声明', "{t('home.readLegal')}"),
 ('<h2 className="mt-2 text-2xl font-bold text-brand-950">常被问到的问题</h2>',
  '<h2 className="mt-2 text-2xl font-bold text-brand-950">{t(\'home.faq\')}</h2>'),
 ('<h2 className="relative text-2xl font-bold">准备好开始研究了吗</h2>',
  '<h2 className="relative text-2xl font-bold">{t(\'home.ctaTitle\')}</h2>'),
 ("""              <Link to="/auth/register" className="btn bg-white px-6 py-3 font-medium text-brand-700 hover:bg-brand-50">
                免费注册
              </Link>
              <Link to="/assessment" className="btn px-6 py-3 text-white ring-1 ring-white/40 hover:bg-white/10">
                先做能力评估
              </Link>""",
"""              <Link to="/auth/register" className="btn bg-white px-6 py-3 font-medium text-brand-700 hover:bg-brand-50">
                {t('home.ctaRegister')}
              </Link>
              <Link to="/assessment" className="btn px-6 py-3 text-white ring-1 ring-white/40 hover:bg-white/10">
                {t('home.ctaAssess')}
              </Link>"""),
]
for a, b in pairs:
    assert a in s, a[:40]
    s = s.replace(a, b)

open(p, 'w', encoding='utf-8').write(s)
print('home step1 ok, length', len(s))
