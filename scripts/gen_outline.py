# -*- coding: utf-8 -*-
"""生成《SEOC Studio 学习资料大纲与写作要求》v2（本地交付，不上线）。
v2 特点：全部内容按“起步篇 → 进阶篇 → 深入篇 → 探索篇”四段循序渐进组织；
目录篇数与单篇字数较 v1 提升约 100% 至 200%。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outline_data_1a import SUBSCRIPTION_A
from outline_data_1b import SUBSCRIPTION_B
from outline_data_2a import SPECIALIZED_A
from outline_data_2b import SPECIALIZED_B
from outline_data_3a import EXPLORATION_A
from outline_data_3b import EXPLORATION_B

SUBSCRIPTION = SUBSCRIPTION_A + SUBSCRIPTION_B
SPECIALIZED = SPECIALIZED_A + SPECIALIZED_B
EXPLORATION = EXPLORATION_A + EXPLORATION_B

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'SEOC学习资料大纲与写作要求.md')

TIER_ORDER = ['起步篇', '进阶篇', '深入篇', '探索篇']
TIER_DESC = {
    '起步篇': '由简到易。建立直觉与最小可运行成果，让读者快速获得正反馈。',
    '进阶篇': '由易到难。引入体系化知识与标准工具，完成从会写到写好的转变。',
    '深入篇': '由难到深。剖析内部机制、性能与工程化，触及实现细节与设计权衡。',
    '探索篇': '由深到开放深入探索。完整项目、前沿议题与开放问题，培养独立研究能力。'
}

HEADER = """# SEOC Studio 学习资料大纲与写作要求（全套 188 章/期）

版本：v2.0（2026-08）
出品：编程研究与探索有限公司 · SEOC Studio
用途：本文件交付给内容生成方（人或 AI），作为全部在售内容正文的写作蓝图。生成方必须严格按照本大纲逐章产出正文。

## v2 修订说明

1. 全部 20 个项目统一按四段进阶结构组织，顺序固定为起步篇、进阶篇、深入篇、探索篇，体现由简到易、由易到难、由难到深、由深到开放深入探索的完整学习路径。
2. 目录总量由 102 章/期扩充至 188 章/期，增幅约 84%；单篇字数目标由 22000 至 30000 字提升至 40000 至 55000 字，整体文字体量提升约 100% 至 200%。
3. 每章/期小节数由 6 节扩充至 8 节，小节均附明确写作要求，并保留交付物清单。

---

## 第一部分 全局写作要求（适用于全部 188 章/期）

### 1. 字数硬指标

| 门类 | 单篇字数目标 |
|------|-------------|
| 订阅式（每章） | 40000 至 50000 汉字 |
| 专研式（每期） | 45000 至 55000 汉字（双语项目为中英合计） |
| 探索式子项目一至四（每期） | 40000 至 50000 汉字 |
| 探索式子项目五至八（每期） | 45000 至 55000 汉字，另含补丁 |

字数统计以正文汉字为准，代码块与表格内容按百分之五十计入。官网公示字数（订阅 22000、专研 26000、探索 22000/26000 起）为对消费者的最低承诺，本大纲为创作目标，交付不得低于大纲下限。低于下限的稿件一律退回重写。

### 2. 循序渐进纪律

1. 四篇结构不可打乱。起步篇禁止出现未解释的高级概念；探索篇禁止重复讲解起步篇已覆盖的基础。
2. 每章/期开头用 300 至 500 字说明本篇在四段路径中的位置、前置章节与阅读收获。
3. 跨越难度的概念首次出现时，必须回指前置章节编号，例如“第 3 章介绍的计算图”。
4. 代码难度逐节爬坡，同一章内最后一个示例的复杂度不得低于前一示例。

### 3. 文风规范

1. 讲解用亲民的话语，像有经验的工程师在带徒弟，把每一个小点解释透，不许用“显而易见”“略”之类的词跳过推理。
2. 专业内容使用正确的官方术语，术语首次出现时给出英文原名与简短定义。
3. 禁止使用大量破折号和大量冒号。破折号全篇不超过 3 处，冒号只用于必要的引出与定义。
4. 彻底去除 AI 腔。禁止“在当今数字化时代”“赋能”“抓手”“闭环”等套话，禁止机械使用“首先其次最后”，段落长短要有变化，允许适当口语化。
5. 每个概念讲完后必须给出可运行的代码或可操作的示例，代码要完整、能直接运行，关键行配注释。
6. 引用史实、数据、规范条文时必须注明出处，不允许编造引用。
7. 每个知识模块配“常见错误”小节，列出初学者真实会踩的坑与报错信息。

### 4. 技术规范

1. Python 代码以 3.12 及以上为准；C++ 以 C++17 为基线，注明 GCC 13 或 MSVC 2022 验证通过。
2. 所有代码必须真实运行过，输出原样附在代码块后，不许虚构输出。
3. 性能数据必须说明测量环境并给出可复现的测量脚本。
4. 图表用 Mermaid 代码或文字表格表达，不要求图片文件。
5. 交付格式为 Markdown，标题层级从二级标题（##）开始，使用 GitHub 风格 Markdown。

### 5. 结构模板（每章/期统一）

1. 开篇导语（300 至 500 字，说明位置、前置与收获）
2. 正文章节（按本大纲列出的 8 节展开，每节 4000 至 7000 字）
3. 本篇小结（500 字以内）
4. 常见错误与排查清单
5. 考核问题（6 至 10 题，附参考答案要点）
6. 延伸阅读（3 至 6 条，注明出处）

---

## 第二部分 分章大纲

"""

def render_product(cat_name, p, index):
    lines = []
    lines.append(f"### {cat_name} · 项目 {index}：{p['name']}")
    lines.append("")
    lines.append(f"- 定价：{p['price']} 元（{p['unit']}）")
    lines.append(f"- 语言：{p.get('lang', '中文')}")
    lines.append(f"- 字数目标：{p['words']}")
    lines.append(f"- 特别说明：{p['notes']}")
    lines.append("")
    chapters = p['chapters']
    for tier in TIER_ORDER:
        tier_chs = [(i + 1, c) for i, c in enumerate(chapters) if c[1] == tier]
        if not tier_chs:
            continue
        lines.append(f"#### {tier}（{len(tier_chs)} 章/期）　*{TIER_DESC[tier]}*")
        lines.append("")
        for _no, c in tier_chs:
            title, _t, sections, extras = c
            lines.append(f"##### {title}")
            lines.append("")
            for i, (sec, req) in enumerate(sections, 1):
                lines.append(f"{i}. **{sec}**　{req}。")
            lines.append("")
            lines.append(f"- 交付要求：{extras}。")
            lines.append("")
    return '\n'.join(lines)

parts = [HEADER]

total = 0
parts.append("## 一、订阅式项目（4 个项目，56 章）\n")
for i, p in enumerate(SUBSCRIPTION, 1):
    parts.append(render_product('订阅式', p, i))
    total += len(p['chapters'])

parts.append("## 二、专研式项目（8 个项目，76 期）\n")
for i, p in enumerate(SPECIALIZED, 1):
    parts.append(render_product('专研式', p, i))
    total += len(p['chapters'])

parts.append("## 三、探索式项目（8 个子项目，56 期）\n")
for i, p in enumerate(EXPLORATION, 1):
    parts.append(render_product('探索式', p, i))
    total += len(p['chapters'])

parts.append("""---

## 第三部分 验收标准

1. 每章/期交付后先经字数与结构机器校验，四篇归属与小节完整性不符即退回。
2. 代码抽查运行率不低于百分之三十，任一虚构输出即整批退回。
3. 文风抽查按本文件第一部分第 3 条执行，破折号、冒号与套话超限即退回。
4. 史实与引用抽查，发现编造出处即整批退回并终止合作。
5. 补丁（探索式子项目五至八）随正文一并交付，每条 300 至 800 字。
6. 循序渐进抽查：随机抽取两个连续章节，确认难度递增且前置引用正确。

本文件版权归编程研究与探索有限公司所有，仅授权内容生成方用于本项目写作。
""")

out = os.path.normpath(OUT)
with open(out, 'w', encoding='utf-8') as f:
    f.write('\n'.join(parts))

size = os.path.getsize(out)
print(f'written: {out}')
print(f'chapters: {total}, size: {size/1024:.1f} KB')
