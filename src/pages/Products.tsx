import { useParams } from 'react-router-dom';
import {
  byCategory,
  EXPLORATION_BUNDLE_ORIGINAL,
  EXPLORATION_BUNDLE_PRICE,
  EXPLORATION_BUNDLE_SLUG,
  EXPLORATION_BUNDLE_TITLE,
  EXPLORATION_MIN_ITEMS
} from '../data/products';
import { CATEGORY_META, CONTACT_EMAIL, type Category } from '../lib/types';
import { PageHeader, ProductCard } from '../components/ui';
import { Link } from 'react-router-dom';
import { fetchAnnouncements, fetchPurchases, hasAccess } from '../lib/content';
import { useEffect, useState } from 'react';
import type { Announcement, Purchase } from '../lib/types';
import { EmptyState } from '../components/ui';
import PurchasePanel from '../components/PurchasePanel';
import { useAuth } from '../lib/auth';

export function CategoryPage({ category }: { category: Category }) {
  const meta = CATEGORY_META[category];
  const items = byCategory(category);
  return (
    <div>
      <PageHeader title={`${meta.name} · ${meta.nameEn}`} sub={meta.tone} />
      <div className="container-x py-10">
        {category === 'exploration' && (
          <div className="card mb-8 border-accent-400/40 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            <p className="font-semibold">入门提示与购买补丁</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>本门类子项目一律面向高阶学者，项目初学者慎入。</li>
              <li>最低需购入 {EXPLORATION_MIN_ITEMS} 个子项目；总期刊包 {EXPLORATION_BUNDLE_PRICE} 元整。</li>
              <li>全期次选购仅限官网开放；每一子项目逐期购入，专题连载完结后可总包购入。</li>
              <li>购买任意项目即可任选一个学术交流群（QQ 群或微信群）。</li>
              <li>购买前请完成免费能力评估，获取评估结果与购买指引。</li>
            </ul>
          </div>
        )}
        {category === 'exploration' && (
          <ExplorationBundleCard />
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
        <p className="mt-8 text-sm text-slate-500">
          本站不进行任何促销优惠活动。凡与官网价格不一致或擅自改价者，请切勿轻信，举报有奖。
          选购与开通请联系 <a className="text-brand-600 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>。
        </p>
      </div>
    </div>
  );
}

function ExplorationBundleCard() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    if (profile) fetchPurchases(profile.id).then(setPurchases);
  }, [profile]);

  const owned = hasAccess(purchases, EXPLORATION_BUNDLE_SLUG);
  const pending = purchases.some((p) => p.product_slug === EXPLORATION_BUNDLE_SLUG && p.status === 'pending');

  return (
    <section className="card mb-8 overflow-hidden border-brand-200 bg-gradient-to-r from-brand-950 to-brand-800 p-6 text-white">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="font-mono text-xs tracking-widest text-accent-300">OFFICIAL ONLY</p>
          <h2 className="mt-2 text-xl font-bold">{EXPLORATION_BUNDLE_TITLE}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-brand-100">
            一次开通探索式全部 8 个子项目，共 32 期正文与后续补丁。单独购入合计
            {EXPLORATION_BUNDLE_ORIGINAL} 元，官网总包价 {EXPLORATION_BUNDLE_PRICE} 元，约省 12%。
            开通后可任选一个学术交流群。
          </p>
        </div>
        <div className="min-w-52 rounded-xl bg-white/10 p-4 ring-1 ring-white/15">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white"><span className="text-sm">¥</span>{EXPLORATION_BUNDLE_PRICE}</span>
            <span className="text-xs text-brand-200">总期刊包</span>
          </div>
          <p className="mt-1 text-xs text-brand-200 line-through">单独购入合计 ¥{EXPLORATION_BUNDLE_ORIGINAL}</p>
          {profile ? (
            owned ? (
              <p className="mt-3 rounded-lg bg-emerald-400/15 px-3 py-2 text-center text-sm text-emerald-200">已开通全部探索式内容</p>
            ) : pending ? (
              <p className="mt-3 rounded-lg bg-amber-400/15 px-3 py-2 text-center text-sm text-amber-100">付款核对中，请等待开通</p>
            ) : (
              <button className="btn mt-3 w-full bg-white text-brand-800 hover:bg-brand-50" onClick={() => setOpen(!open)}>
                {open ? '收起总包购买' : '购买总期刊包'}
              </button>
            )
          ) : (
            <Link to={`/auth/login?next=${encodeURIComponent('/products/exploration')}`} className="btn mt-3 w-full bg-white text-brand-800 hover:bg-brand-50">
              登录后购买总包
            </Link>
          )}
        </div>
      </div>
      {profile && open && !owned && !pending && (
        <div className="mt-5 max-w-xl text-slate-900">
          <PurchasePanel
            slug={EXPLORATION_BUNDLE_SLUG}
            title={EXPLORATION_BUNDLE_TITLE}
            price={EXPLORATION_BUNDLE_PRICE}
            unit="总期刊包"
            onDone={() => profile && fetchPurchases(profile.id).then(setPurchases)}
          />
        </div>
      )}
    </section>
  );
}

export function ProductsIndex() {
  return (
    <div>
      <PageHeader title="全部内容" sub="三大门类：订阅式项目、专研式项目、探索式项目。" />
      <div className="container-x grid gap-4 py-10 md:grid-cols-3">
        {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
          const meta = CATEGORY_META[c];
          const items = byCategory(c);
          return (
            <Link key={c} to={meta.path} className="card group p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
              <p className="text-xs font-medium text-brand-600">{meta.nameEn}</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900 group-hover:text-brand-700">{meta.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{meta.tone}</p>
              <p className="mt-4 text-sm text-slate-400">共 {items.length} 个项目</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AnnouncementsPage() {
  const [anns, setAnns] = useState<Announcement[] | null>(null);
  useEffect(() => {
    fetchAnnouncements().then(setAnns);
  }, []);
  return (
    <div>
      <PageHeader title="公告" sub="平台运营与内容连载相关公告。" />
      <div className="container-x max-w-3xl py-10">
        {!anns ? (
          <EmptyState title="加载中" />
        ) : anns.length === 0 ? (
          <EmptyState title="暂无公告" />
        ) : (
          <ul className="space-y-4">
            {anns.map((a) => (
              <li key={a.id} className="card p-5">
                <p className="flex items-center gap-2 font-medium text-slate-900">
                  {a.pinned && <span className="badge bg-accent-400/20 text-accent-600">置顶</span>}
                  {a.title}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{a.body}</p>
                <p className="mt-3 text-xs text-slate-400">{new Date(a.published_at).toLocaleDateString('zh-CN')}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function LegalRedirectHelper() {
  const { doc } = useParams();
  return <p className="hidden">{doc}</p>;
}
