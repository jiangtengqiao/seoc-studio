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

# 1. 消息渲染：管理模式的复选框 + 气泡旁删除
rep("""          {messages.map((msg, i) => (
            <div key={i} className={`mb-5 flex w-full items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>""",
"""          {messages.map((msg, i) => {
            const key = msgKey(msg, i);
            const selected = selectedIds.has(key);
            return (
            <div key={key} className={`mb-5 flex w-full items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} ${selected ? 'opacity-90' : ''}`}>
              {manageMode && (
                <button
                  onClick={() => toggleSelect(key)}
                  className={`mt-6 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                    selected ? 'border-red-500 bg-red-500 text-white' : 'border-slate-300 hover:border-red-400'
                  }`}
                  aria-label="选择该消息"
                >
                  {selected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
              )}""", 'msg render open')

rep("""              </div>
            </div>
          ))}

          {/* 实时消耗条 */}""",
"""              </div>
            </div>
            );
          })}

          {/* 实时消耗条 */}""", 'msg render close')

# 2. 输入区上方加消息管理工具条
rep("""      {/* 输入区 */}
      <div className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">""",
"""      {/* 消息管理工具条 */}
      {historyLoaded && messages.length > 0 && !streaming && (
        <div className="border-t border-slate-100 bg-slate-50/80 dark:bg-slate-800/60">
          <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 px-4 py-2 text-xs">
            <button
              onClick={() => { setManageMode(!manageMode); setSelectedIds(new Set()); }}
              className={`rounded-lg border px-2.5 py-1 font-medium transition ${
                manageMode ? 'border-red-400 bg-red-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-red-300 dark:border-slate-600 dark:bg-slate-800'
              }`}
            >
              {manageMode ? '退出选择' : '消息管理'}
            </button>
            {manageMode && (
              <>
                <button
                  onClick={() => setSelectedIds(new Set(messages.map((m, i) => msgKey(m, i))))}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 transition hover:border-brand-400 dark:border-slate-600 dark:bg-slate-800"
                >
                  全选本对话
                </button>
                <button
                  onClick={doDeleteSelected}
                  disabled={selectedIds.size === 0 || deleteBusy}
                  className="rounded-lg bg-red-500 px-3 py-1 font-medium text-white transition hover:bg-red-600 disabled:opacity-40"
                >
                  删除所选（{selectedIds.size}）
                </button>
              </>
            )}
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-slate-500 dark:text-slate-400">按时间范围删除：</span>
            <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800" />
            <span className="text-slate-400">至</span>
            <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-800" />
            <button
              onClick={doDeleteRange}
              disabled={!currentConversationId || !rangeFrom || !rangeTo || deleteBusy}
              className="rounded-lg bg-red-500/90 px-2.5 py-1 font-medium text-white transition hover:bg-red-600 disabled:opacity-40"
            >
              删除范围
            </button>
            <span className="ml-auto text-slate-400 dark:text-slate-500">删除不退还研点</span>
          </div>
          {deleteMsg && (
            <p className="mx-auto w-full max-w-3xl px-4 pb-2 text-xs font-medium text-red-500">{deleteMsg}</p>
          )}
        </div>
      )}

      {/* 输入区 */}
      <div className="border-t border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">""", 'manage toolbar')

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('chat part2 ok')
