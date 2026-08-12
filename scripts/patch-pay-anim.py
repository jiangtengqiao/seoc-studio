import io

# 1. CSS 追加动效
css_path = 'src/styles/index.css'
css = io.open(css_path, encoding='utf-8', newline='').read()
addition = '''

/* ===== 支付码选中动效 ===== */
/* 选中揭晓：从模糊锁定态过渡到清晰可扫 */
@keyframes pay-reveal {
  0% { filter: blur(6px) grayscale(40%); transform: scale(1.06); opacity: 0.7; }
  100% { filter: blur(0) grayscale(0); transform: scale(1); opacity: 1; }
}
.pay-reveal { animation: pay-reveal 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
/* 锁定罩落下 */
@keyframes pay-cover {
  0% { opacity: 0; transform: translateY(-6%); }
  100% { opacity: 1; transform: translateY(0); }
}
.pay-cover-in { animation: pay-cover 0.35s ease-out both; }
/* 选中勾弹入 */
@keyframes check-pop {
  0% { transform: scale(0); }
  60% { transform: scale(1.25); }
  100% { transform: scale(1); }
}
.check-pop { animation: check-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
/* 选中卡片整体浮起 */
.pay-card {
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}
.pay-card-selected {
  transform: translateY(-2px) scale(1.02);
}
@media (prefers-reduced-motion: reduce) {
  .pay-reveal, .pay-cover-in, .check-pop { animation: none; }
}
'''
if 'pay-reveal' not in css:
    css = css.rstrip() + addition + '\n'
    io.open(css_path, 'w', encoding='utf-8', newline='').write(css)
print('css ok')

# 2. PurchasePanel 接入动效类
pp = 'src/components/PurchasePanel.tsx'
s = io.open(pp, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'

def rep(old, new):
    global s
    o = old.replace('\n', nl)
    assert o in s, 'NOT FOUND: ' + old[:60]
    s = s.replace(o, new.replace('\n', nl), 1)

# 卡片容器加 pay-card 类与选中浮起
rep("""                className={`group rounded-xl border-2 bg-white p-2.5 text-center transition ${
                  selected
                    ? 'border-brand-500 shadow-md'
                    : 'border-slate-200 hover:border-brand-300'
                }`}""",
"""                className={`pay-card group rounded-xl border-2 bg-white p-2.5 text-center ${
                  selected
                    ? 'pay-card-selected border-brand-500 shadow-lg'
                    : 'border-slate-200 hover:border-brand-300'
                }`}""")

# 选中图片播揭晓动效（用 key 强制重放）
rep("""                  <img
                    src={PAYMENT_METHODS[key].qr}
                    alt={`${PAYMENT_METHODS[key].label}收款码`}
                    loading="eager"
                    className={`w-full transition duration-300 ${selected ? '' : 'scale-105 blur-[7px] grayscale-[40%]'}`}
                  />""",
"""                  <img
                    key={selected ? 'on' : 'off'}
                    src={PAYMENT_METHODS[key].qr}
                    alt={`${PAYMENT_METHODS[key].label}收款码`}
                    loading="eager"
                    className={`w-full ${selected ? 'pay-reveal' : 'scale-105 blur-[7px] grayscale-[40%]'}`}
                  />""")

# 锁定罩加落下动效
rep('<span className="pay-lock absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white transition group-hover:brightness-110">',
    '<span className="pay-lock pay-cover-in absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white transition group-hover:brightness-110">')

# 勾选圆点弹入
rep("""                    {selected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}""",
"""                    {selected && (
                      <svg className="check-pop" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}""")

# 右上角"可扫码支付"徽标弹入
rep('<span className="absolute right-1.5 top-1.5 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">',
    '<span className="check-pop absolute right-1.5 top-1.5 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">')

io.open(pp, 'w', encoding='utf-8', newline='').write(s)
print('panel ok')
