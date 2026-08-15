import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { reportVisit, plantHoneypot, reportTrapHit } from './lib/security';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { I18nProvider } from './lib/i18n';
import Layout from './components/Layout';
import Home from './pages/Home';
import { AnnouncementsPage, CategoryPage, ProductsIndex } from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Reader from './pages/Reader';
import Assessment from './pages/Assessment';
import Legal from './pages/Legal';
import { LoginPage, RegisterPage, ResetPage } from './pages/Auth';
import Account from './pages/Account';
import Admin from './pages/Admin';
import { CommunityPage, SearchPage } from './pages/Explore';
import { SurveysPage, SurveyDetailPage } from './pages/Surveys';
import { ForumPage, ForumPostPage } from './pages/Forum';
import AIChat from './pages/AIChat';
import AICredits from './pages/AICredits';
import AIApiKeys from './pages/AIApiKeys';
import Notifications from './pages/Notifications';
import { Link } from 'react-router-dom';
import { RequireAuth } from './components/AuthGate';

function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <p className="text-5xl font-bold text-brand-200">404</p>
      <p className="mt-3 text-slate-600">页面不存在</p>
      <Link to="/" className="btn-primary mt-6">返回首页</Link>
    </div>
  );
}

function VisitReporter() {
  const { pathname } = useLocation();
  useEffect(() => {
    // 蜜饬陷阱：路径命中即上报（爬虫/扫描器才会进入这种路径）
    if (pathname.toLowerCase().includes('antibot-trap')) {
      reportTrapHit();
      showWallStandalone();
      return;
    }
    reportVisit(pathname);
  }, [pathname]);
  // 页面就绪后埋蜜饬隐藏链接
  useEffect(() => {
    const t = setTimeout(() => plantHoneypot(), 800);
    return () => clearTimeout(t);
  }, []);
  return null;
}

/** 蜜饬命中后的全屏法律警告（不复用会话级拦截，确保每次都展示） */
function showWallStandalone(): void {
  if (document.getElementById('seoc-trap-wall')) return;
  const div = document.createElement('div');
  div.id = 'seoc-trap-wall';
  div.style.cssText =
    'position:fixed;inset:0;z-index:99999;background:rgba(127,29,29,.97);color:#fff;display:flex;align-items:center;justify-content:center;padding:2rem;';
  div.innerHTML =
    '<div style="max-width:640px;text-align:center"><h2 style="font-size:1.5rem;font-weight:700;margin-bottom:1rem">警告：恶意爬取属违法行为</h2><p style="line-height:1.8;font-size:.95rem;opacity:.92">您已触发本站反爬防护机制。依据《中华人民共和国网络安全法》第二十七条、《中华人民共和国刑法》第二百八十五条，非法获取计算机信息系统数据可处三年以下有期徒刑或拘役；情节特别严重的处三年以上七年以下有期徒刑。您的 IP 已被自动封禁并完整记录证据，本站保留追究法律责任的权利。确有正当研究需要的，请通过 jiangtengqiao@qq.com 书面申请授权。</p></div>';
  document.body.appendChild(div);
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL}>
        <VisitReporter />
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<ProductsIndex />} />
            <Route path="products/subscription" element={<CategoryPage category="subscription" />} />
            <Route path="products/specialized" element={<CategoryPage category="specialized" />} />
            <Route path="products/exploration" element={<CategoryPage category="exploration" />} />
            <Route path="product/:slug" element={<ProductDetail />} />
            <Route
              path="reader/:slug/:issue"
              element={
                <RequireAuth reason="期刊正文仅对注册用户开放，登录后可试读首期，开通后解锁全部。">
                  <Reader />
                </RequireAuth>
              }
            />
            <Route path="assessment" element={<Assessment />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="community" element={<CommunityPage />} />
          <Route path="surveys" element={<SurveysPage />} />
          <Route path="surveys/:slug" element={<SurveyDetailPage />} />
          <Route path="forum" element={<ForumPage />} />
          <Route path="forum/:id" element={<ForumPostPage />} />
            <Route path="legal" element={<Legal />} />
            <Route path="legal/:doc" element={<Legal />} />
            <Route path="auth/login" element={<LoginPage />} />
            <Route path="auth/register" element={<RegisterPage />} />
            <Route path="auth/reset" element={<ResetPage />} />
            <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="admin" element={<RequireAuth reason="管理端仅限管理员账户访问。"><Admin /></RequireAuth>} />
            <Route path="ai" element={<RequireAuth reason="研智助手仅对登录用户开放。"><AIChat /></RequireAuth>} />
            <Route path="ai/credits" element={<RequireAuth><AICredits /></RequireAuth>} />
            <Route path="ai/api" element={<RequireAuth><AIApiKeys /></RequireAuth>} />
            <Route path="notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
          </BrowserRouter>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
