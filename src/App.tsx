import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
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
            <Route path="legal" element={<Legal />} />
            <Route path="legal/:doc" element={<Legal />} />
            <Route path="auth/login" element={<LoginPage />} />
            <Route path="auth/register" element={<RegisterPage />} />
            <Route path="auth/reset" element={<ResetPage />} />
            <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="admin" element={<RequireAuth reason="管理端仅限管理员账户访问。"><Admin /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
