import { useEffect, useState } from 'react';
import {
  getAllModels,
  updateModel,
  getPlatformStats,
  listAllTopupOrders,
  confirmTopupOrder,
  listAllMembershipOrders,
  confirmMembershipOrder,
  adminListAIUsers,
  adminAdjustCredits,
  adminSetMembership,
  adminSetBanned,
  listContentFilters,
  addContentFilter,
  removeContentFilter,
  TIER_INFO,
  type AIModel,
  type AITopupOrder,
  type AIMembershipOrder,
  type AIAdminUser,
  type AIContentFilter,
} from '../lib/ai';

type SubTab = 'overview' | 'models' | 'orders' | 'users' | 'filters';

const TIER_OPTIONS = ['free', 'lite', 'plus', 'pro', 'max'] as const;

export default function AIAdminPanel() {
  const [tab, setTab] = useState<SubTab>('overview');
  const [stats, setStats] = useState({
    total_calls: 0,
    total_cost: 0,
    active_users: 0,
    today_calls: 0,
    pending_topup: 0,
    pending_membership: 0,
  });
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelDrafts, setModelDrafts] = useState<Record<string, { input_price: number; output_price: number; free_daily_quota: number; min_tier: string; enabled: boolean }>>({});
  const [topupOrders, setTopupOrders] = useState<(AITopupOrder & { email?: string })[]>([]);
  const [membershipOrders, setMembershipOrders] = useState<(AIMembershipOrder & { email?: string })[]>([]);
  const [users, setUsers] = useState<AIAdminUser[]>([]);
  const [filters, setFilters] = useState<AIContentFilter[]>([]);
  const [newFilter, setNewFilter] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3000);
  };

  const loadStats = async () => {
    try {
      const s = await getPlatformStats();
      if (s) setStats(s);
    } catch {
      /* 忽略 */
    }
  };

  const loadModels = async () => {
    try {
      // 全部模型（含已禁用）：管理页需要能看到并重新启用被禁用的模型
      const m = await getAllModels();
      setModels(m);
      setModelDrafts(
        Object.fromEntries(
          m.map((x) => [
            x.id,
            {
              input_price: Number(x.input_price),
              output_price: Number(x.output_price),
              free_daily_quota: Number(x.free_daily_quota),
              min_tier: x.min_tier,
              enabled: Boolean(x.enabled),
            },
          ])
        )
      );
    } catch {
      /* 忽略 */
    }
  };

  const loadOrders = async () => {
    try {
      setTopupOrders(await listAllTopupOrders('pending'));
    } catch {
      /* 忽略 */
    }
    try {
      setMembershipOrders(await listAllMembershipOrders('pending'));
    } catch {
      /* 忽略 */
    }
  };

  const loadUsers = async () => {
    try {
      setUsers(await adminListAIUsers());
    } catch {
      /* 忽略 */
    }
  };

  const loadFilters = async () => {
    try {
      setFilters(await listContentFilters());
    } catch {
      /* 忽略 */
    }
  };

  useEffect(() => {
    loadStats();
    loadModels();
    loadOrders();
    loadUsers();
    loadFilters();
  }, []);

  const saveModel = async (id: string) => {
    const d = modelDrafts[id];
    if (!d) return;
    try {
      await updateModel(id, {
        input_price: d.input_price,
        output_price: d.output_price,
        free_daily_quota: d.free_daily_quota,
        min_tier: d.min_tier as AIModel['min_tier'],
        enabled: d.enabled,
      });
      flash(`模型 ${id} 已保存`);
      await loadModels();
    } catch (e) {
      flash(`保存失败: ${e}`);
    }
  };

  const handleAdjustCredits = async (u: AIAdminUser) => {
    const amountStr = prompt(`为 ${u.email} 调整研点（正数增加 / 负数扣减，当前余额 ${Number(u.balance).toLocaleString()}）：`);
    if (amountStr == null) return;
    const amount = Number(amountStr);
    if (!Number.isFinite(amount) || amount === 0) {
      flash('金额无效');
      return;
    }
    const note = prompt('调整说明（会写进用户流水与通知）：') || '管理员调整';
    try {
      await adminAdjustCredits(u.id, amount, note);
      flash('研点已调整，用户已收到通知');
      await loadUsers();
    } catch (e) {
      flash(`调整失败: ${e}`);
    }
  };

  const handleSetMembership = async (u: AIAdminUser) => {
    const tier = prompt(`设置 ${u.email} 的会员等级（free/lite/plus/pro/max）：`, u.membership_tier || 'free');
    if (!tier || !(TIER_OPTIONS as readonly string[]).includes(tier.toLowerCase())) {
      flash('等级无效');
      return;
    }
    const t = tier.toLowerCase();
    let days: number | null = 30;
    if (t !== 'free') {
      const daysStr = prompt('有效期天数（留空=30 天）：', '30');
      days = daysStr === null ? null : daysStr === '' ? 30 : Number(daysStr);
      if (days !== null && (!Number.isFinite(days) || days <= 0)) {
        flash('天数无效');
        return;
      }
    }
    try {
      await adminSetMembership(u.id, t, t === 'free' ? null : days);
      flash('会员已调整，用户已收到通知');
      await loadUsers();
    } catch (e) {
      flash(`设置失败: ${e}`);
    }
  };

  const handleBan = async (u: AIAdminUser) => {
    const action = u.is_banned ? '解封' : '封禁';
    if (!confirm(`确认${action} ${u.email}？${u.is_banned ? '' : '封禁后其聊天与 API 立即不可用。'}`)) return;
    try {
      await adminSetBanned(u.id, !u.is_banned);
      flash(`${action}成功，用户已收到通知`);
      await loadUsers();
    } catch (e) {
      flash(`${action}失败: ${e}`);
    }
  };

  const handleAddFilter = async () => {
    const pattern = newFilter.trim();
    if (!pattern) return;
    try {
      await addContentFilter(pattern);
      setNewFilter('');
      flash('敏感词已添加（立即生效，命中则拒绝请求）');
      await loadFilters();
    } catch (e) {
      flash(`添加失败: ${e}`);
    }
  };

  const handleRemoveFilter = async (f: AIContentFilter) => {
    if (!confirm(`删除敏感词「${f.pattern}」？`)) return;
    try {
      await removeContentFilter(f.id);
      await loadFilters();
    } catch (e) {
      flash(`删除失败: ${e}`);
    }
  };

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'overview', label: '统计概览' },
    { key: 'models', label: '模型定价' },
    { key: 'orders', label: `订单确认${stats.pending_topup + stats.pending_membership > 0 ? `（${stats.pending_topup + stats.pending_membership}）` : ''}` },
    { key: 'users', label: '用户管理' },
    { key: 'filters', label: '内容审核' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-2 flex flex-wrap gap-2">
        {subTabs.map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key)}
            className={s.key === tab ? 'btn-primary !py-1.5 !text-xs' : 'btn-outline !py-1.5 !text-xs'}
          >
            {s.label}
          </button>
        ))}
      </div>

      {msg && (
        <p className="rounded-lg bg-brand-50 px-4 py-2 text-sm text-brand-800">{msg}</p>
      )}

      {tab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-5 text-center">
            <p className="text-3xl font-bold text-brand-700">{stats.total_calls.toLocaleString()}</p>
            <p className="mt-1 text-sm text-slate-500">全站总调用次数</p>
            <p className="mt-0.5 text-xs text-slate-400">今日 {stats.today_calls.toLocaleString()} 次</p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-3xl font-bold text-amber-600">{Number(stats.total_cost).toFixed(2)}</p>
            <p className="mt-1 text-sm text-slate-500">全站总研点消耗</p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-3xl font-bold text-emerald-600">{stats.active_users}</p>
            <p className="mt-1 text-sm text-slate-500">使用 AI 的用户数</p>
            <p className="mt-0.5 text-xs text-slate-400">
              待确认：充值 {stats.pending_topup} · 会员 {stats.pending_membership}
            </p>
          </div>
        </div>
      )}

      {tab === 'models' && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800">模型定价表（可在线编辑）</h3>
            <p className="text-xs text-slate-400">
              修改价格 / 每日免费 / 会员门槛 / 启停后点击「保存」。单位：研点/千 token（1 元 = 1000 研点）。
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">模型 ID</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">厂商</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">输入价格</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">输出价格</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">每日免费</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">最低会员</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">启用</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => {
                  const d = modelDrafts[m.id];
                  if (!d) return null;
                  const providerName =
                    m.provider === 'alibaba' ? '通义' :
                    m.provider === 'zhipu' ? '智谱' :
                    m.provider === 'deepseek' ? 'DeepSeek' :
                    m.provider === 'bytedance' ? '豆包' : m.provider;
                  return (
                    <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-mono text-xs text-slate-700">{m.id}</p>
                        <p className="text-[11px] text-slate-400">{providerName}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="badge bg-slate-100 text-slate-600">{providerName}</span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={d.input_price}
                          onChange={(e) =>
                            setModelDrafts((prev) => ({ ...prev, [m.id]: { ...d, input_price: Number(e.target.value) } }))
                          }
                          className="input !w-24 !px-2 !py-1 text-right font-mono text-xs"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={d.output_price}
                          onChange={(e) =>
                            setModelDrafts((prev) => ({ ...prev, [m.id]: { ...d, output_price: Number(e.target.value) } }))
                          }
                          className="input !w-24 !px-2 !py-1 text-right font-mono text-xs"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={d.free_daily_quota}
                          onChange={(e) =>
                            setModelDrafts((prev) => ({ ...prev, [m.id]: { ...d, free_daily_quota: Number(e.target.value) } }))
                          }
                          className="input !w-16 !px-2 !py-1 text-center font-mono text-xs"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <select
                          value={d.min_tier}
                          onChange={(e) =>
                            setModelDrafts((prev) => ({ ...prev, [m.id]: { ...d, min_tier: e.target.value } }))
                          }
                          className="input !w-24 !px-2 !py-1 text-xs"
                        >
                          {TIER_OPTIONS.filter((t) => t !== 'free').map((t) => (
                            <option key={t} value={t}>{TIER_INFO[t].name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() =>
                            setModelDrafts((prev) => ({ ...prev, [m.id]: { ...d, enabled: !d.enabled } }))
                          }
                          className={`badge px-2 py-1 text-xs ${d.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {d.enabled ? '启用' : '禁用'}
                        </button>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => saveModel(m.id)} className="btn-primary !px-3 !py-1 !text-xs">
                          保存
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <>
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-800">会员开通确认</h3>
              <p className="text-xs text-slate-400">
                用户点击「我已支付」后显示绿色标记。核验付款到账后确认：会员自动开通（续费顺延）、赠送研点入账、站内信通知用户；驳回则订单关闭。
              </p>
            </div>
            {membershipOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">暂无待确认的会员订单。</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">用户邮箱</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">套餐</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">金额</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">赠送研点</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">提交时间</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membershipOrders.map((o) => (
                      <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          <p>{o.email || '-'}</p>
                          {o.payment_claimed && (
                            <span className="badge bg-emerald-50 text-emerald-600">已声称支付</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="badge bg-brand-50 text-brand-700">{TIER_INFO[o.tier].name}</span>
                          <span className="ml-1 text-xs text-slate-400">{o.period === 'monthly' ? '月付' : '年付'}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{o.yuan} 元</td>
                        <td className="px-4 py-3 text-right text-slate-700">{o.granted_points.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            className="btn-primary !py-1 !text-xs mr-2"
                            onClick={async () => {
                              await confirmMembershipOrder(o.id, true);
                              await loadOrders();
                              await loadStats();
                            }}
                          >
                            确认到账
                          </button>
                          <button
                            className="btn-outline !py-1 !text-xs"
                            onClick={async () => {
                              await confirmMembershipOrder(o.id, false);
                              await loadOrders();
                              await loadStats();
                            }}
                          >
                            驳回
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-800">研点充值确认</h3>
              <p className="text-xs text-slate-400">
                用户点击「我已支付」后显示绿色标记。核验付款到账后确认：研点自动入账并站内信通知用户。
              </p>
            </div>
            {topupOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">暂无待确认的充值订单。</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">用户邮箱</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">金额</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-600">研点</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600">提交时间</th>
                      <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topupOrders.map((o) => (
                      <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-700">
                          <p>{o.email || '-'}</p>
                          {o.payment_claimed && (
                            <span className="badge bg-emerald-50 text-emerald-600">已声称支付</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{o.yuan} 元</td>
                        <td className="px-4 py-3 text-right text-slate-700">{o.points.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            className="btn-primary !py-1 !text-xs mr-2"
                            onClick={async () => {
                              await confirmTopupOrder(o.id, true);
                              await loadOrders();
                              await loadStats();
                            }}
                          >
                            确认到账
                          </button>
                          <button
                            className="btn-outline !py-1 !text-xs"
                            onClick={async () => {
                              await confirmTopupOrder(o.id, false);
                              await loadOrders();
                              await loadStats();
                            }}
                          >
                            驳回
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800">用户管理</h3>
            <p className="text-xs text-slate-400">
              调整研点 / 设置会员 / 封禁均会站内信通知用户。封禁后聊天与 API 立即被服务端拒绝。
            </p>
          </div>
          {users.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">暂无用户数据。</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">用户</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">会员</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">研点余额</th>
                    <th className="px-4 py-3 text-right font-medium text-slate-600">今日免费</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">状态</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{u.email}</p>
                        <p className="text-xs text-slate-400">{u.nickname || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${u.membership_tier === 'free' ? 'bg-slate-100 text-slate-500' : 'bg-brand-50 text-brand-700'}`}>
                          {u.membership_tier === 'free' ? '免费' : TIER_INFO[u.membership_tier as keyof typeof TIER_INFO]?.name || u.membership_tier}
                        </span>
                        {u.membership_expires_at && (
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {new Date(u.membership_expires_at).toLocaleDateString('zh-CN')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700">
                        {Number(u.balance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{u.free_remaining}</td>
                      <td className="px-4 py-3 text-center">
                        {u.is_banned ? (
                          <span className="badge bg-red-50 text-red-600">已封禁</span>
                        ) : (
                          <span className="badge bg-emerald-50 text-emerald-600">正常</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleAdjustCredits(u)} className="btn-outline !py-1 !text-xs mr-1">
                          调研点
                        </button>
                        <button onClick={() => handleSetMembership(u)} className="btn-outline !py-1 !text-xs mr-1">
                          设会员
                        </button>
                        <button
                          onClick={() => handleBan(u)}
                          className={`!py-1 !text-xs ${u.is_banned ? 'btn-ghost text-emerald-600' : 'btn-outline border-red-200 text-red-600'}`}
                        >
                          {u.is_banned ? '解封' : '封禁'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'filters' && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-800">内容审核敏感词</h3>
            <p className="text-xs text-slate-400">
              用户输入（聊天与 API）命中任一敏感词时服务端直接拒绝。添加后立即生效。
            </p>
          </div>
          <div className="flex gap-3 border-b border-slate-100 px-6 py-4">
            <input
              type="text"
              value={newFilter}
              onChange={(e) => setNewFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
              placeholder="输入敏感词 / 短语"
              className="input flex-1"
            />
            <button onClick={handleAddFilter} disabled={!newFilter.trim()} className="btn-primary shrink-0">
              添加
            </button>
          </div>
          {filters.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">暂无敏感词（默认不拦截任何输入）。</div>
          ) : (
            <ul>
              {filters.map((f, i) => (
                <li
                  key={f.id}
                  className={`flex items-center justify-between px-6 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                >
                  <div>
                    <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                      {f.pattern}
                    </code>
                    <span className="ml-3 text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <button onClick={() => handleRemoveFilter(f)} className="text-xs text-red-600 hover:underline">
                    删除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
