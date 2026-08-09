import { useParams } from 'react-router-dom';
import { byCategory, EXPLORATION_BUNDLE_PRICE, EXPLORATION_MIN_ITEMS } from '../data/products';
import { CATEGORY_META, CONTACT_EMAIL, type Category } from '../lib/types';
import { PageHeader, ProductCard } from '../components/ui';
import { Link } from 'react-router-dom';
import { fetchAnnouncements } from '../lib/content';
import { useEffect, useState } from 'react';
import type { Announcement } from '../lib/types';
import { EmptyState } from '../components/ui';

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
