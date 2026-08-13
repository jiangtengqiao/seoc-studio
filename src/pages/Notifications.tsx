import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import { Reveal } from '../components/fx';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllReadNotifications,
  type AINotification,
} from '../lib/ai';

const KIND_STYLE: Record<AINotification['kind'], { label: string; cls: string }> = {
  system: { label: '系统', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  order: { label: '订单', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  membership: { label: '会员', cls: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' },
};

export default function Notifications() {
  const { t } = useI18n();
  const [items, setItems] = useState<AINotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      setItems(await listNotifications());
      setErr(null);
    } catch (e) {
      setErr(String(e));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const notifyBadge = () => window.dispatchEvent(new CustomEvent('seoc:notify-update'));

  const handleRead = async (n: AINotification) => {
    if (n.read) return;
    // 先乐观更新界面
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    try {
      await markNotificationRead(n.id);
      notifyBadge();
    } catch (e) {
      setErr(`标记失败: ${e}`);
      load();
    }
  };

  const handleReadAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    try {
      await markAllNotificationsRead();
      notifyBadge();
    } catch (e) {
      setErr(`标记失败: ${e}`);
      load();
    }
  };

  const handleDelete = async (n: AINotification) => {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    try {
      await deleteNotification(n.id);
      notifyBadge();
    } catch (e) {
      setErr(`删除失败: ${e}`);
      load();
    }
  };

  const handleDeleteRead = async () => {
    if (!confirm(t('notify.deleteReadConfirm'))) return;
    setItems((prev) => prev.filter((x) => !x.read));
    try {
      await deleteAllReadNotifications();
      notifyBadge();
    } catch (e) {
      setErr(`删除失败: ${e}`);
      load();
    }
  };

  const unread = items.filter((n) => !n.read).length;
  const readCount = items.length - unread;

  return (
    <div className="container-x max-w-3xl py-8">
      <Reveal>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-950">{t('notify.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('notify.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            {unread > 0 && (
              <button onClick={handleReadAll} className="btn-outline text-sm">
                {t('notify.readAll')}
              </button>
            )}
            {readCount > 0 && (
              <button onClick={handleDeleteRead} className="btn-ghost text-sm text-slate-500">
                {t('notify.deleteRead')}
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {err && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{err}</p>
      )}

      <Reveal>
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">{t('notify.loading')}</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">{t('notify.empty')}</div>
          ) : (
            <ul>
              {items.map((n, i) => {
                const style = KIND_STYLE[n.kind] || KIND_STYLE.system;
                return (
                  <li
                    key={n.id}
                    onClick={() => handleRead(n)}
                    className={`cursor-pointer px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-700/40 ${
                      i > 0 ? 'border-t border-slate-100 dark:border-slate-700' : ''
                    } ${n.read ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-sm font-semibold ${n.read ? 'text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                            {n.title}
                          </p>
                          <span className={`badge px-1.5 py-0.5 text-[10px] ${style.cls}`}>{style.label}</span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{n.body}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(n.created_at).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(n);
                        }}
                        className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                        title={t('notify.delete')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Reveal>
    </div>
  );
}
