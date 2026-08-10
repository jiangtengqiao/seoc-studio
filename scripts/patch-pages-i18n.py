# -*- coding: utf-8 -*-
"""把第二批 i18n 键接入 Products / ProductDetail / Auth / Assessment / Account 页面。"""

def patch(path, pairs, imports=None, hook=None):
    s = open(path, encoding='utf-8').read()
    if imports:
        for anchor, imp in imports:
            if imp.strip() not in s:
                assert anchor in s, (path, anchor)
                s = s.replace(anchor, anchor + '\n' + imp, 1)
    if hook:
        anchor, code = hook
        assert anchor in s, (path, anchor)
        s = s.replace(anchor, anchor + '\n  ' + code, 1)
    for a, b in pairs:
        assert a in s, (path, a[:36])
        s = s.replace(a, b)
    open(path, 'w', encoding='utf-8').write(s)
    print('patched', path)

# ProductDetail
patch('src/pages/ProductDetail.tsx', [
    ("{showBuy ? '收起购买面板' : '立即购买'}", "{showBuy ? '收起购买面板' : t('detail.buyNow')}"),
    ('已开通，立即阅读', "{t('detail.owned')}，立即阅读"),
],
    imports=[("import { useAuth } from '../lib/auth';", "import { useI18n } from '../lib/i18n';")],
    hook=("export default function ProductDetail() {", "const { t } = useI18n();"))

# Auth（三个子组件都需要 t）
import re as _re
_s = open('src/pages/Auth.tsx', encoding='utf-8').read()
for _fn in ['export function LoginPage() {', 'export function RegisterPage() {', 'export function ResetPage() {']:
    assert _fn in _s
    _s = _s.replace(_fn, _fn + "\n  const { t } = useI18n();", 1)
open('src/pages/Auth.tsx', 'w', encoding='utf-8').write(_s)
patch('src/pages/Auth.tsx', [
    ('<label className="label" htmlFor="email">邮箱</label>', '<label className="label" htmlFor="email">{t(\'auth.email\')}</label>'),
    ('<label className="label" htmlFor="pwd">密码</label>', '<label className="label" htmlFor="pwd">{t(\'auth.password\')}</label>'),
    ('<label className="label" htmlFor="pwd2">确认密码</label>', '<label className="label" htmlFor="pwd2">{t(\'auth.password\')}</label>'),
    ('<label className="label">邮件验证码</label>', '<label className="label">{t(\'auth.code\')}</label>'),
    ("to=\"/auth/reset\">忘记密码</Link>", "to=\"/auth/reset\">{t('auth.forgot')}</Link>"),
    ("cloud ? '发送验证码' : '注册'", "cloud ? t('auth.sendCode') : t('auth.register')"),
    ('已有账户？', "{t('auth.hasAccount')}？"),
],
    imports=[("import { useAuth } from '../lib/auth';", "import { useI18n } from '../lib/i18n';")],
    hook=None)

# Assessment
_s = open('src/pages/Assessment.tsx', encoding='utf-8').read()
_fn = 'export default function Assessment() {'
assert _fn in _s
_s = _s.replace(_fn, _fn + "\n  const { t } = useI18n();", 1)
open('src/pages/Assessment.tsx', 'w', encoding='utf-8').write(_s)
patch('src/pages/Assessment.tsx', [
    ("!profile ? '登录后开始评估' : quota.canStart ? '开始评估' : '免费额度已用完'",
     "!profile ? t('common.loginFirst') : quota.canStart ? t('assess.start') : '免费额度已用完'"),
    ('<button className="btn-ghost" onClick={openHistory}>历史记录</button>',
     '<button className="btn-ghost" onClick={openHistory}>{t(\'assess.history\')}</button>'),
],
    imports=[("import { useAuth } from '../lib/auth';", "import { useI18n } from '../lib/i18n';")],
    hook=None)

# Account
_s = open('src/pages/Account.tsx', encoding='utf-8').read()
_fn = 'export default function Account() {'
assert _fn in _s
_s = _s.replace(_fn, _fn + "\n  const { t } = useI18n();", 1)
open('src/pages/Account.tsx', 'w', encoding='utf-8').write(_s)
patch('src/pages/Account.tsx', [
    ('<PageHeader title="用户中心"', "<PageHeader title={t('account.title')}"),
    ('待确认的选购申请</h3>', "{t('account.pending')}</h3>"),
],
    imports=[("import { useAuth } from '../lib/auth';", "import { useI18n } from '../lib/i18n';")],
    hook=None)

print('all pages patched')
