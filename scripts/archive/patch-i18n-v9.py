import io

p = 'src/lib/i18n.tsx'
s = io.open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'

blocks = [
    ("'nav.surveys': '问卷中心',", ["'nav.products': '全部产品',", "'nav.more': '全部导航',", "'nav.groupProducts': '内容门类',", "'nav.groupLearn': '学习工具',", "'nav.groupCommunity': '社区与动态',", "'nav.groupAccount': '我的账户',"]),
    ("'nav.surveys': '問卷中心',", ["'nav.products': '全部產品',", "'nav.more': '全部導航',", "'nav.groupProducts': '內容門類',", "'nav.groupLearn': '學習工具',", "'nav.groupCommunity': '社群與動態',", "'nav.groupAccount': '我的帳戶',"]),
    ("'nav.surveys': 'Surveys',", ["'nav.products': 'All Products',", "'nav.more': 'All Navigation',", "'nav.groupProducts': 'Collections',", "'nav.groupLearn': 'Study Tools',", "'nav.groupCommunity': 'Community',", "'nav.groupAccount': 'My Account',"]),
    ("'nav.surveys': 'アンケート',", ["'nav.products': 'すべての製品',", "'nav.more': '全ナビゲーション',", "'nav.groupProducts': 'コンテンツ',", "'nav.groupLearn': '学習ツール',", "'nav.groupCommunity': 'コミュニティ',", "'nav.groupAccount': 'マイアカウント',"]),
    ("'nav.surveys': '설문 센터',", ["'nav.products': '전체 제품',", "'nav.more': '전체 메뉴',", "'nav.groupProducts': '콘텐츠',", "'nav.groupLearn': '학습 도구',", "'nav.groupCommunity': '커뮤니티',", "'nav.groupAccount': '내 계정',"]),
    ("'nav.surveys': 'Sondages',", ["'nav.products': 'Tous les produits',", "'nav.more': 'Toute la navigation',", "'nav.groupProducts': 'Contenus',", "'nav.groupLearn': " + '"Outils d’étude",' + "", "'nav.groupCommunity': 'Communauté',", "'nav.groupAccount': 'Mon compte',"]),
    ("'nav.surveys': 'Umfragen',", ["'nav.products': 'Alle Produkte',", "'nav.more': 'Gesamte Navigation',", "'nav.groupProducts': 'Inhalte',", "'nav.groupLearn': 'Lernwerkzeuge',", "'nav.groupCommunity': 'Community',", "'nav.groupAccount': 'Mein Konto',"]),
    ("'nav.surveys': 'Encuestas',", ["'nav.products': 'Todos los productos',", "'nav.more': 'Toda la navegación',", "'nav.groupProducts': 'Contenidos',", "'nav.groupLearn': 'Herramientas',", "'nav.groupCommunity': 'Comunidad',", "'nav.groupAccount': 'Mi cuenta',"]),
    ("'nav.surveys': 'Опросы',", ["'nav.products': 'Все продукты',", "'nav.more': 'Вся навигация',", "'nav.groupProducts': 'Материалы',", "'nav.groupLearn': 'Инструменты',", "'nav.groupCommunity': 'Сообщество',", "'nav.groupAccount': 'Мой аккаунт',"]),
]

count = 0
for anchor, keys in blocks:
    idx = s.find(anchor)
    assert idx >= 0, anchor
    addition = ''.join(k + nl + '  ' for k in keys)
    s = s[:idx] + addition + s[idx:]
    count += 1

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('locales patched:', count)
