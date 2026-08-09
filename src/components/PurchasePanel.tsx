import { useState, type FormEvent } from 'react';
import { isCloudEnabled, supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { PriceTag } from './ui';

const QR_URL = `${import.meta.env.BASE_URL}pay/alipay.png`;

export function bundleDisplay(slug: string): string {
  return slug === 'exploration-bundle' ? '探索式项目总期刊包（全部 8 个子项目）' : slug;
}

export async function createPurchase(input: {
  userId: string;
  productSlug: string;
  note: string;
}): Promise<string | null> {
  if (isCloudEnabled && supabase) {
    const { error } = await supabase.from('purchases').insert({
      user_id: input.userId,
      product_slug: input.productSlug,
      issue_range: 'all',
      status: 'pending',
      note: input.note
    });
    return error ? error.message : null;
  }
  try {
    const key = `seoc.local.purchases.${input.userId}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    list.unshift({
      id: 'local-' + Date.now(),
      user_id: input.userId,
      product_slug: input.productSlug,
      issue_range: 'all',
      status: 'confirmed',
      note: input.note,
      created_at: new Date().toISOString()
    });
    localStorage.setItem(key, JSON.stringify(list));
    return null;
  } catch {
    return '本地存储失败';
  }
}

export default function PurchasePanel({
  slug,
  title,
  price,
  unit,
  onDone
}: {
  slug: string;
  title: string;
  price: number;
  unit: string;
  onDone?: () => void;
}) {
  const { profile } = useAuth();
  const [payer, setPayer] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (payer.trim().length < 2) return;
    setState('busy');
    const err = await createPurchase({
      userId: profile.id,
      productSlug: slug,
      note: `付款人支付宝：${payer.trim()}${note.trim() ? '；备注：' + note.trim() : ''}`
    });
    setState(err ? 'error' : 'done');
    if (!err && onDone) onDone();
  }

  if (state === 'done') {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800" style={{ animation: 'rise-in 0.3s ease both' }}>
        <p className="font-semibold">购买申请已提交</p>
        <p className="mt-1">
          我们正在人工核对您的付款，确认后系统会自动开通，用户中心将显示已购内容，无需其他操作。
          如长时间未开通，请发送邮件至 jiangtengqiao@qq.com 查询进度。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-brand-100 bg-white p-4" style={{ animation: 'rise-in 0.3s ease both' }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <PriceTag price={price} unit={unit} />
      </div>

      <div className="mt-3 rounded-lg bg-brand-50 p-3 text-center">
        <p className="mb-2 text-xs text-slate-500">第一步：支付宝扫码支付 ¥{price.toFixed(2)}</p>
        <img src={QR_URL} alt="支付宝收款码" className="mx-auto w-44 rounded-lg border border-slate-200" />
        <p className="mt-2 text-xs leading-5 text-slate-500">
          收款方：编程研究与探索（JTQ）<br />
          支付时请在备注中填写您的<strong className="text-brand-700">注册邮箱</strong>，以便核对
        </p>
      </div>

      <form onSubmit={submit} className="mt-3 space-y-2">
        <p className="text-xs text-slate-500">第二步：提交付款信息，人工确认后立即开通</p>
        <input
          className="input !py-2 text-sm"
          placeholder="您的支付宝账号或付款人姓名"
          value={payer}
          onChange={(e) => setPayer(e.target.value)}
          required
        />
        <input
          className="input !py-2 text-sm"
          placeholder="补充说明（选填），如付款时间、订单号"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn-primary w-full" disabled={state === 'busy' || payer.trim().length < 2}>
          {state === 'busy' ? '提交中' : '我已完成支付，提交开通申请'}
        </button>
        {state === 'error' && <p className="text-xs text-red-600">提交失败，请重试或改用邮件联系。</p>}
        <p className="text-[11px] leading-5 text-slate-400">
          数字商品一经下单并支付概不退款，下单并支付即视为成年人行为。详见《数字内容购买协议》。
        </p>
      </form>
    </div>
  );
}
