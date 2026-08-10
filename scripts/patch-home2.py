# -*- coding: utf-8 -*-
p = 'src/pages/Home.tsx'
s = open(p, encoding='utf-8').read()

# 1. FAQ 扩充（追加 4 条）
old_faq_tail = """  {
    q: '内容版权归谁，我能转载吗？',
    a: '全部原创内容版权归编程研究与探索有限公司所有。购入获得的是个人学习使用许可，不得转载、转售或上传至任何公开渠道。'
  }
];"""
new_faq_tail = """  {
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
];"""
assert old_faq_tail in s
s = s.replace(old_faq_tail, new_faq_tail)

# 2. 在“公告 + 承诺”区块之前插入新底部区块
anchor = '      {/* 公告 + 承诺 */}'
assert anchor in s

new_sections = """      {/* 内容体量总览 */}
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

"""
s = s.replace(anchor, new_sections + anchor)

open(p, 'w', encoding='utf-8').write(s)
print('home step2 ok, length', len(s))
