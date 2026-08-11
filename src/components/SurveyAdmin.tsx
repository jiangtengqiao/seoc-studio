import { useEffect, useRef, useState } from 'react';
import {
  BUILTIN_SURVEYS, adminListResponses, adminListSurveys, parseSurveyMarkdown,
  publishSurvey, questionCountOf, setSurveyStatus,
  type SurveyDef, type SurveyMeta
} from '../lib/surveys';
import { Spinner } from './ui';

const KIND_NAME: Record<string, string> = { single: '单选', multi: '多选', ranking: '排序', text: '开放' };

/** 读取上传文件为纯文本：md/txt 直读，docx 用 mammoth 提取 */
async function readFileText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth/mammoth.browser');
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return result.value;
  }
  return file.text();
}

export default function SurveyAdmin() {
  const [tab, setTab] = useState<'publish' | 'manage' | 'data'>('publish');
  const [slug, setSlug] = useState('');
  const [md, setMd] = useState('');
  const [preview, setPreview] = useState<SurveyDef | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<SurveyMeta[] | null>(null);
  const [responses, setResponses] = useState<{ email: string; answers: Record<string, string | string[]>; createdAt: string }[] | null>(null);
  const [respSurvey, setRespSurvey] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = () => adminListSurveys().then(setList);
  useEffect(() => { if (tab !== 'publish') reload(); }, [tab]);

  const doParse = () => {
    setMsg('');
    if (!md.trim()) { setMsg('请先粘贴问卷内容或上传文件'); return; }
    const def = parseSurveyMarkdown(md, slug.trim() || `survey-${Date.now().toString(36)}`);
    if (!def.title || questionCountOf(def) === 0) {
      setMsg('解析不到题目，请检查格式：分节用"一、"开头，题目以（单选/多选/排序题/开放填空）结尾，选项行保持缩进');
      setPreview(null);
      return;
    }
    setPreview(def);
  };

  const doPublish = async (status: 'published' | 'draft') => {
    if (!preview) return;
    setBusy(true);
    const r = await publishSurvey(preview, status);
    setBusy(false);
    setMsg(r.message);
    if (r.ok && status === 'published') { setPreview(null); setMd(''); setSlug(''); }
  };

  const onFile = async (f: File) => {
    try {
      const text = await readFileText(f);
      setMd(text);
      if (!slug) setSlug(f.name.replace(/\.(md|txt|docx)$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `survey-${Date.now().toString(36)}`);
      setMsg(`已读取 ${f.name}（${(text.length / 1024).toFixed(1)} KB），请点击"解析预览"确认结构`);
    } catch {
      setMsg('文件读取失败，请改用 .md / .txt / .docx 格式');
    }
  };

  const loadResponses = async (s: string) => {
    setRespSurvey(s);
    setResponses(null);
    setResponses(await adminListResponses(s));
  };

  const publishBuiltin = async () => {
    setBusy(true);
    const r = await publishSurvey(BUILTIN_SURVEYS[0]);
    setBusy(false);
    setMsg(r.message === '已发布到问卷中心' ? '内置问卷已建档到云端，用户答卷将开始计数' : r.message);
  };

  return (
    <div>
      <div className="mb-5 flex gap-2">
        {([['publish', '发布问卷'], ['manage', '问卷管理'], ['data', '答卷数据']] as const).map(([k, label]) => (
          <button key={k} className={tab === k ? 'btn-primary' : 'btn-outline'} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'publish' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card space-y-4 p-6">
            <h3 className="text-base font-semibold text-slate-900">下发新问卷</h3>
            <p className="text-xs leading-6 text-slate-500">
              支持三种方式：直接粘贴问卷文本、上传 Markdown / TXT / Word(.docx) 文件。
              格式约定：分节以「一、二、三、」开头；题目行以（单选）（多选）（排序题）（开放填空）结尾；
              选项行保持缩进；以问号结尾且无类型标注的行按开放题处理；💡 起的内容作为内部附录，不向用户展示。
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">问卷标识（slug，用于链接，仅限小写字母数字与连字符）</label>
              <input className="input font-mono" placeholder="例如 product-feedback-v1" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">问卷内容</label>
              <textarea className="input min-h-[260px] resize-y font-mono text-xs" placeholder="粘贴问卷全文…" value={md} onChange={(e) => { setMd(e.target.value); setPreview(null); }} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".md,.txt,.docx,markdown"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
              />
              <button className="btn-outline" onClick={() => fileRef.current?.click()}>上传文档</button>
              <button className="btn-outline" onClick={doParse}>解析预览</button>
              <button className="btn-primary" disabled={!preview || busy} onClick={() => doPublish('published')}>
                {busy ? '发布中…' : '发布到问卷中心'}
              </button>
              <button className="btn-ghost" disabled={!preview || busy} onClick={() => doPublish('draft')}>存为草稿</button>
            </div>
            {msg && <p className="text-sm text-brand-700">{msg}</p>}
            <div className="border-t border-slate-100 pt-4">
              <button className="btn-ghost text-xs" disabled={busy} onClick={publishBuiltin}>
                将内置的《用户体验深度调研问卷》建档到云端（用于统计回收份数）
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="mb-3 text-base font-semibold text-slate-900">解析预览</h3>
            {!preview ? (
              <p className="py-10 text-center text-sm text-slate-400">解析后在这里确认题目结构，无误再发布</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-lg font-bold text-brand-950">{preview.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {preview.sections.length} 个模块 · {questionCountOf(preview)} 题 · slug: {preview.slug}
                  </p>
                </div>
                {preview.sections.map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-100 p-4">
                    <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                    <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
                      {s.questions.map((q) => (
                        <li key={q.id} className="flex gap-2">
                          <span className="badge shrink-0 bg-slate-100 text-slate-500">{KIND_NAME[q.kind]}{q.optional ? '·选填' : ''}</span>
                          <span className="line-clamp-1">{q.text}</span>
                          {q.options.length > 0 && <span className="shrink-0 text-slate-300">{q.options.length} 项</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {preview.appendix && <p className="text-xs text-slate-400">已识别内部附录 {preview.appendix.length} 字（不向用户展示）</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'manage' && (
        <div className="card overflow-x-auto p-0">
          {!list ? <Spinner /> : list.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">还没有云端问卷，去"发布问卷"下发第一份</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400">
                  <th className="px-4 py-3 font-medium">问卷</th>
                  <th className="px-4 py-3 font-medium">slug</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">回收</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.slug} className="border-b border-slate-50">
                    <td className="max-w-[280px] truncate px-4 py-3 font-medium text-slate-800">{s.title}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.slug}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.status === 'published' ? 'bg-emerald-50 text-emerald-600' : s.status === 'closed' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-600'}`}>
                        {s.status === 'published' ? '进行中' : s.status === 'closed' ? '已关闭' : '草稿'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{s.responseCount ?? 0} 份</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {s.status !== 'published' && <button className="btn-ghost text-xs" onClick={async () => { await setSurveyStatus(s.slug, 'published'); reload(); }}>发布</button>}
                        {s.status === 'published' && <button className="btn-ghost text-xs" onClick={async () => { await setSurveyStatus(s.slug, 'closed'); reload(); }}>关闭</button>}
                        <button className="btn-ghost text-xs" onClick={() => { setTab('data'); loadResponses(s.slug); }}>答卷</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'data' && (
        <div className="card p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">答卷数据</h3>
            {list?.map((s) => (
              <button key={s.slug} className={`badge cursor-pointer ${respSurvey === s.slug ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => loadResponses(s.slug)}>
                {s.slug}（{s.responseCount ?? 0}）
              </button>
            ))}
            {!list && <button className="btn-outline" onClick={reload}>加载问卷列表</button>}
          </div>
          {!respSurvey ? (
            <p className="py-8 text-center text-sm text-slate-400">选择一份问卷查看回收的答卷</p>
          ) : !responses ? (
            <Spinner />
          ) : responses.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">该问卷暂无回收数据</p>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">共 {responses.length} 份，按提交时间倒序。完整数据可在 Supabase 控制台 survey_responses 表导出。</p>
              {responses.map((r, i) => (
                <details key={i} className="rounded-xl border border-slate-100 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    #{responses.length - i} {r.email} · {new Date(r.createdAt).toLocaleString('zh-CN')}
                  </summary>
                  <dl className="mt-3 space-y-2 text-xs leading-5">
                    {Object.entries(r.answers).map(([qid, v]) => (
                      <div key={qid} className="flex gap-2">
                        <dt className="shrink-0 font-mono font-bold text-brand-600">{qid}</dt>
                        <dd className="text-slate-600">{Array.isArray(v) ? v.join(' → ') : v}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
