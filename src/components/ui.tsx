import { Link } from 'react-router-dom';
import type { Product } from '../lib/types';
import { CATEGORY_META } from '../lib/types';

export function Spinner({ text = '加载中' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="container-x py-10">
        <h1 className="text-2xl font-bold text-brand-950 sm:text-3xl">{title}</h1>
        {sub && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{sub}</p>}
      </div>
    </div>
  );
}

export function PriceTag({ price, unit }: { price: number; unit?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-accent-600">
        <span className="text-sm">¥</span>
        {price.toFixed(price % 1 === 0 ? 0 : 2)}
      </span>
      {unit && <span className="text-xs text-slate-500">{unit}</span>}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const meta = CATEGORY_META[product.category];
  return (
    <Link
      to={`/product/${product.slug}`}
      className="card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-center justify-between">
        <span className="badge bg-brand-50 text-brand-700">{meta.name}</span>
        <span className="font-mono text-xs text-slate-400">No.{product.index}</span>
      </div>
      <h3 className="text-base font-semibold leading-6 text-slate-900 group-hover:text-brand-700">
        {product.title}
      </h3>
      <p className="line-clamp-2 text-sm leading-6 text-slate-500">{product.description}</p>
      <div className="mt-auto flex items-end justify-between pt-2">
        <PriceTag price={product.price} unit={product.unit} />
        <span className="text-xs text-slate-400">{product.lang}</span>
      </div>
    </Link>
  );
}

export function FieldError({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}
