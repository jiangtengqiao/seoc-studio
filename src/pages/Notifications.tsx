import { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';
import { Reveal } from '../components/fx';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
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

  const load = async () => {
    try {
      setItems(await listNotifications());
    } catch {
      /* 忽略 */
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRead = async (n: AINotification) => {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    window.dispatchEvent(new CustomEvent('seoc:notify-update'));
    try {
      await markNotificationRead(n.id);
    } catch {
      /* 忽略 */
    }
  };

  const handleReadAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    window.dispatchEvent(new CustomEvent('seoc:notify-update'));
    try {
      await markAllNotificationsRead();
    } catch {
      /* 忽略 */
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="container-x max-w-3xl py-8">
      <Reveal>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-950">{t('notify.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('notify.subtitle')}</p>
          </div>
          {unread > 0 && (
            <button onClick={handleReadAll} className="btn-outline text-sm">
              {t('notify.readAll')}
            </button>
          )}
        </div>
      </Reveal>

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
