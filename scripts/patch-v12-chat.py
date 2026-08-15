import io

p = 'src/pages/AIChat.tsx'
s = io.open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'

def rep(old, new, tag):
    global s
    o = old.replace('\n', nl)
    n = new.replace('\n', nl)
    assert o in s, 'NOT FOUND [%s]: %s' % (tag, old[:60])
    s = s.replace(o, n, 1)

# 1. Message 接口扩展 id/created_at
rep("""interface Message {
  role: 'user' | 'assistant';
  content: string;
  interrupted?: boolean;
  interruptReason?: string;
  cost?: number;
  isFree?: boolean;
}""",
"""interface Message {
  role: 'user' | 'assistant';
  content: string;
  interrupted?: boolean;
  interruptReason?: string;
  cost?: number;
  isFree?: boolean;
  dbId?: string;
  createdAt?: string;
}""", 'msg iface')

# 2. 导入删除函数
rep("  saveConversationMessage,\n  TIER_ORDER,",
"""  saveConversationMessage,
  deleteConversation,
  deleteAllConversations,
  deleteMessagesRange,
  deleteMessagesByIds,
  TIER_ORDER,""", 'imports')

# 3. 加载与切换会话时保留 id/created_at
old_map = "          setMessages(\n            msgs.map((mm) => ({\n              role: mm.role,\n              content: mm.content,\n              interrupted: mm.interrupted,\n              cost: mm.cost,\n              isFree: mm.is_free,\n            }))\n          );"
new_map = """          setMessages(
            msgs.map((mm) => ({
              role: mm.role,
              content: mm.content,
              interrupted: mm.interrupted,
              cost: mm.cost,
              isFree: mm.is_free,
              dbId: mm.id,
              createdAt: mm.created_at,
            }))
          );"""
rep(old_map, new_map, 'load map')

old_map2 = "      setMessages(\n        msgs.map((mm) => ({\n          role: mm.role,\n          content: mm.content,\n          interrupted: mm.interrupted,\n          cost: mm.cost,\n          isFree: mm.is_free,\n        }))\n      );"
new_map2 = """      setMessages(
        msgs.map((mm) => ({
          role: mm.role,
          content: mm.content,
          interrupted: mm.interrupted,
          cost: mm.cost,
          isFree: mm.is_free,
          dbId: mm.id,
          createdAt: mm.created_at,
        }))
      );"""
rep(old_map2, new_map2, 'switch map')

# 4. 状态与处理函数（插在 sidebarOpen 状态之后；用 historyLoaded 锚点前）
rep("  const [historyLoaded, setHistoryLoaded] = useState(false);",
"""  const [historyLoaded, setHistoryLoaded] = useState(false);
  // —— 消息/会话删除（研点不退） ——
  const [manageMode, setManageMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>([]);
  const [rangeFrom, setRangeFrom] = useState<string>('');
  const [rangeTo, setRangeTo] = useState<string>('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState('');

  const refreshConversations = async () => {
    try {
      const convs = await listConversations();
      setConversations(convs);
    } catch { /* 忽略 */ }
  };

  const msgKey = (m: Message, i: number) => m.dbId || `idx-${i}`;

  const toggleSelect = (key: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const doDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确定删除选中的 ${selectedIds.size} 条消息吗？删除后不可恢复，已消耗的研点不予退还。`)) return;
    setDeleteBusy(true);
    try {
      const ids = messages.filter((m, i) => selectedIds.has(msgKey(m, i)) && m.dbId).map((m) => m.dbId!);
      if (ids.length > 0) {
        const n = await deleteMessagesByIds(ids);
        setDeleteMsg(`已删除 ${n} 条消息（研点不退）`);
      }
      setMessages((prev) => prev.filter((m, i) => !selectedIds.has(msgKey(m, i))));
      setSelectedIds(new Set());
    } catch (e) {
      setDeleteMsg('删除失败：' + (e as Error).message);
    }
    setDeleteBusy(false);
    setTimeout(() => setDeleteMsg(''), 4000);
  };

  const doDeleteRange = async () => {
    if (!currentConversationId || !rangeFrom || !rangeTo) return;
    const from = new Date(rangeFrom).toISOString();
    const to = new Date(new Date(rangeTo).getTime() + 86399999).toISOString();
    if (!window.confirm('确定删除该时间范围内的全部消息吗？删除后不可恢复，已消耗的研点不予退还。')) return;
    setDeleteBusy(true);
    try {
      const n = await deleteMessagesRange(currentConversationId, from, to);
      setMessages((prev) => prev.filter((m) => !m.createdAt || m.createdAt < from || m.createdAt > to));
      setDeleteMsg(`已删除 ${n} 条消息（研点不退）`);
    } catch (e) {
      setDeleteMsg('删除失败：' + (e as Error).message);
    }
    setDeleteBusy(false);
    setRangeFrom(''); setRangeTo('');
    setTimeout(() => setDeleteMsg(''), 4000);
  };

  const doDeleteConversation = async (id: string) => {
    if (!window.confirm('确定删除该会话及其全部消息吗？删除后不可恢复，已消耗的研点不予退还。')) return;
    try {
      await deleteConversation(id);
      const convs = await listConversations();
      setConversations(convs);
      if (id === currentConversationId) {
        setMessages([]);
        setCurrentConversationId(null);
      }
    } catch { /* 忽略 */ }
  };

  const doDeleteAll = async () => {
    if (!window.confirm('确定清空全部会话与消息吗？删除后不可恢复，已消耗的研点不予退还。')) return;
    try {
      await deleteAllConversations();
      setConversations([]); setMessages([]); setCurrentConversationId(null);
    } catch { /* 忽略 */ }
  };""", 'state fns')

# 5. 侧边栏：清空全部 + 会话删除按钮
rep("""        <div className="border-b border-slate-100 p-3 dark:border-slate-700">
          <button
            onClick={newChat}
            disabled={streaming}
            className="btn-primary w-full justify-center py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            + {t('ai.chat.newChat')}
          </button>
        </div>""",
"""        <div className="border-b border-slate-100 p-3 dark:border-slate-700">
          <div className="flex gap-2">
            <button
              onClick={newChat}
              disabled={streaming}
              className="btn-primary flex-1 justify-center py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              + {t('ai.chat.newChat')}
            </button>
            <button
              onClick={doDeleteAll}
              disabled={streaming || conversations.length === 0}
              title="清空全部会话（研点不退）"
              className="rounded-lg border border-red-200 px-2.5 text-xs text-red-500 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-900/50 dark:hover:bg-red-950/30"
            >
              清空
            </button>
          </div>
        </div>""", 'sidebar top')

rep("""            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => switchConversation(c.id)}
                disabled={streaming}""",
"""            conversations.map((c) => (
              <div key={c.id} className="group relative">
              <button
                onClick={() => switchConversation(c.id)}
                disabled={streaming}""", 'conv wrapper open')

rep("""                <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                  {new Date(c.updated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))""",
"""                <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                  {new Date(c.updated_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
              <button
                onClick={() => doDeleteConversation(c.id)}
                disabled={streaming}
                title="删除该会话（研点不退）"
                className="absolute right-1 top-1.5 hidden rounded-md p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500 group-hover:block dark:hover:bg-red-950/40"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
              </div>
            ))""", 'conv wrapper close')

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('chat part1 ok')
