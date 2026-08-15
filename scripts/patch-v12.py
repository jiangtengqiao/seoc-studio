import io, re

# ---------- App.tsx：路由变化上报访问 + 反爬 ----------
p = 'src/App.tsx'
s = io.open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'

old = "import { BrowserRouter, Route, Routes } from 'react-router-dom';"
new = """import { BrowserRouter, Route, Routes, useLocation, useEffect } from 'react-router-dom';
import { reportVisit } from './lib/security';"""
assert old in s
s = s.replace(old, new, 1)

# 在 App 内加路由上报组件
old2 = """export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>"""
new2 = """function VisitReporter() {
  const { pathname } = useLocation();
  useEffect(() => {
    reportVisit(pathname);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
        <VisitReporter />"""
assert old2 in s
s = s.replace(old2, new2, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('app ok')

# ---------- auth.tsx：登录后校验指纹 ----------
p2 = 'src/lib/auth.tsx'
s2 = io.open(p2, encoding='utf-8', newline='').read()
nl2 = '\r\n' if '\r\n' in s2 else '\n'

m = re.search(r"import .*?from '\./supabase';", s2)
if m and 'security' not in s2:
    imp = m.group(0)
    s2 = s2.replace(imp, imp + "\nimport { verifySessionFingerprint } from './security';", 1)

# 在 loadCloud 成功后校验
old3 = None
for cand in [
    "        supabase?.auth.onAuthStateChange(() => loadCloud());",
]:
    if cand in s2:
        old3 = cand
        break
if old3:
    new3 = """        supabase?.auth.onAuthStateChange(async (event) => {
          if (event === 'SIGNED_IN') {
            // 异常登录检测：设备指纹变化时强制下线重新验证
            await verifySessionFingerprint(() => { window.location.href = import.meta.env.BASE_URL + 'auth/login?sec=1'; });
          }
          loadCloud();
        });"""
    s2 = s2.replace(old3, new3, 1)
    print('auth hook ok')
else:
    print('auth hook NOT FOUND — 检查 auth.tsx')
io.open(p2, 'w', encoding='utf-8', newline='').write(s2)
