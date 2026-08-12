import { useState, type FormEvent } from 'react';
import { isCloudEnabled, supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { PriceTag } from './ui';

const PAYMENT_METHODS = {
  alipay: {
    label: '支付宝',
    qr: `${import.meta.env.BASE_URL}pay/alipay.png`
  },
  wechat: {
    label: '微信支付',
    qr: `${import.meta.env.BASE_URL}pay/wechatpay.png`
  }
} as const;

type PaymentMethod = keyof typeof PAYMENT_METHODS;

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
  const [method, setMethod] = useState<PaymentMethod>('alipay');
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
      note: `支付方式：${PAYMENT_METHODS[method].label}；付款人：${payer.trim()}${note.trim() ? '；备注：' + note.trim() : ''}`
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

      <div className="mt-3 rounded-lg bg-brand-50 p-3">
        <p className="mb-3 text-center text-xs text-slate-500">
          第一步：任选一种方式扫码支付 ¥{price.toFixed(2)}。两个收款码同时展示，<br />
          您点击选用哪个，哪个即刻清晰呈现；未选中的将被安全覆盖，无法扫码
        </p>
        {/* 双码同屏：选中的清晰，未选中的被锁定覆盖物遮盖；点击任意一侧即切换 */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((key) => {
            const selected = method === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMethod(key)}
                className={`pay-card group rounded-xl border-2 bg-white p-2.5 text-center ${
                  selected
                    ? 'pay-card-selected border-brand-500 shadow-lg'
                    : 'border-slate-200 hover:border-brand-300'
                }`}
              >
                <span className="relative mx-auto block w-full max-w-40 overflow-hidden rounded-lg border border-slate-100">
                  <img
                    key={selected ? 'on' : 'off'}
                    src={PAYMENT_METHODS[key].qr}
                    alt={`${PAYMENT_METHODS[key].label}收款码`}
                    loading="eager"
                    className={`w-full ${selected ? 'pay-reveal' : 'scale-105 blur-[7px] grayscale-[40%]'}`}
                  />
                  {!selected && (
                    <span className="pay-lock pay-cover-in absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white transition group-hover:brightness-110">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      </svg>
                      <span className="text-xs font-medium tracking-wide">已安全锁定</span>
                      <span className="text-[10px] opacity-80">点击选用此方式</span>
                    </span>
                  )}
                  {selected && (
                    <span className="check-pop absolute right-1.5 top-1.5 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                      可扫码支付
                    </span>
                  )}
                </span>
                <p className={`mt-2 flex items-center justify-center gap-1.5 text-sm ${selected ? 'font-semibold text-brand-700' : 'text-slate-500'}`}>
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full border transition ${
                    selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'
                  }`}>
                    {selected && (
                      <svg className="check-pop" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {PAYMENT_METHODS[key].label}
                </p>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-center text-xs leading-5 text-slate-500">
          收款方：编程研究与探索（JTQ）<br />
          支付时请在备注中填写您的<strong className="text-brand-700">注册邮箱</strong>，以便核对；
          点击收款码可标记您实际使用的方式
        </p>
      </div>

      <form onSubmit={submit} className="mt-3 space-y-2">
        <p className="text-xs text-slate-500">第二步：提交付款信息，人工确认后立即开通</p>
        <input
          className="input !py-2 text-sm"
          placeholder={`您的${PAYMENT_METHODS[method].label}账号或付款人姓名`}
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
