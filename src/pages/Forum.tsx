import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import {
  FORUM_TAGS, createComment, createPost, deleteComment, deletePost,
  getPost, listComments, listPosts,
  type ForumComment, type ForumPost
} from '../lib/forum';
import { EmptyState, PageHeader, Spinner } from '../components/ui';

function fmtTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return d.toLocaleDateString('zh-CN');
}

const TAG_COLORS: Record<string, string> = {
  学习交流: 'bg-brand-50 text-brand-700',
  产品建议: 'bg-violet-50 text-violet-700',
  问题反馈: 'bg-amber-50 text-amber-700',
  晒单分享: 'bg-emerald-50 text-emerald-700',
  闲聊灌水: 'bg-slate-100 text-slate-600'
};

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold text-white">
      {(name || 'U')[0].toUpperCase()}
    </span>
  );
}

function PostForm({ onDone }: { onDone: (id?: string) => void }) {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState<string>(FORUM_TAGS[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async () => {
    if (!profile) return;
    setBusy(true);
    setMsg('');
    const r = await createPost(profile.id, profile.nickname || profile.email.split('@')[0], title, body, tag);
    setBusy(false);
    if (r.ok) onDone(r.id);
    else setMsg(r.message);
  };

  return (
    <div className="card space-y-4 p-6">
      <h3 className="text-base font-semibold text-slate-900">发起新讨论</h3>
      <div className="flex flex-wrap gap-2">
        {FORUM_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(t)}
            className={`badge cursor-pointer transition ${tag === t ? TAG_COLORS[t] + ' ring-2 ring-brand-300' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
          >
            {t}
          </button>
        ))}
      </div>
      <input className="input" placeholder="一句话说清主题，例如：第 3 期的推导过程我有个更简洁的写法" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input min-h-[140px] resize-y" placeholder="展开说说。支持换行，禁止广告与侵权内容。" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex items-center justify-between">
        <p className="text-xs text-red-600">{msg}</p>
        <button className="btn-primary" disabled={busy || !title.trim() || !body.trim()} onClick={submit}>
          {busy ? '发布中…' : '发布讨论'}
        </button>
      </div>
    </div>
  );
}

export function ForumPage() {
  const { profile } = useAuth();
  const [tag, setTag] = useState('');
  const [posts, setPosts] = useState<ForumPost[] | null>(null);
  const [composing, setComposing] = useState(false);
  const navigate = useNavigate();

  const reload = () => listPosts(tag || undefined).then(setPosts);
  useEffect(() => { setPosts(null); reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [tag]);

  return (
    <div>
      <PageHeader
        title="用户讨论区"
        sub="与同频的学习者交流心得、提出建议、反馈问题。发帖与评论需登录，全站可读。请遵守社区公约：友善交流，禁止广告、侵权与任何形式的资料外传。"
      />
      <div className="container-x grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <button
              className={`badge cursor-pointer transition ${!tag ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              onClick={() => setTag('')}
            >
              全部
            </button>
            {FORUM_TAGS.map((t) => (
              <button
                key={t}
                className={`badge cursor-pointer transition ${tag === t ? TAG_COLORS[t] + ' ring-2 ring-brand-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                onClick={() => setTag(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {composing && profile && (
            <div className="mb-6">
              <PostForm onDone={(id) => { setComposing(false); reload(); if (id) navigate(`/forum/${id}`); }} />
            </div>
          )}

          {!posts ? (
            <Spinner text="正在加载讨论" />
          ) : posts.length === 0 ? (
            <EmptyState title="还没有讨论" hint={profile ? '点击右侧"发起讨论"，成为第一个发言的人' : '登录后即可发起第一个讨论'} />
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <Link key={p.id} to={`/forum/${p.id}`}
                  className="card flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <Avatar name={p.author} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ${TAG_COLORS[p.tag] || TAG_COLORS['闲聊灌水']}`}>{p.tag}</span>
                      <h3 className="truncate text-[15px] font-semibold text-slate-900">{p.title}</h3>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-500">{p.body}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {p.author} · {fmtTime(p.createdAt)} · {p.commentCount} 条评论
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <div className="card p-5">
            {profile ? (
              <>
                <p className="text-sm leading-6 text-slate-600">有想法、有疑问、有建议？</p>
                <button className="btn-primary mt-3 w-full" onClick={() => setComposing(!composing)}>
                  {composing ? '收起编辑' : '发起讨论'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm leading-6 text-slate-600">登录后即可发起讨论与评论。</p>
                <Link to="/auth/login" className="btn-primary mt-3 block text-center">登录参与</Link>
              </>
            )}
          </div>
          <div className="card p-5">
            <p className="mb-2 text-sm font-semibold text-slate-800">社区公约</p>
            <ul className="list-disc space-y-1.5 pl-4 text-xs leading-6 text-slate-500">
              <li>禁止以任何形式外传、倒卖平台付费内容</li>
              <li>禁止广告、刷屏与人身攻击</li>
              <li>学术讨论注明出处，尊重原创</li>
              <li>违反公约的内容将被移除，情节严重者封禁账户</li>
            </ul>
          </div>
          <div className="card p-5 text-xs leading-6 text-slate-500">
            更即时的交流可加入官方 QQ / 微信学术群，详见
            <Link to="/community" className="text-brand-600 hover:underline"> 社群与公告</Link>。
          </div>
        </aside>
      </div>
    </div>
  );
}

export function ForumPostPage() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[] | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [notFound, setNotFound] = useState(false);

  const reload = async () => {
    if (!id) return;
    const p = await getPost(id);
    if (!p) { setNotFound(true); return; }
    setPost(p);
    setComments(await listComments(id));
  };
  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const canManage = (ownerId: string) => profile && (profile.id === ownerId || profile.role === 'admin');

  const onComment = async () => {
    if (!profile || !id) return;
    setBusy(true);
    const r = await createComment(id, profile.id, profile.nickname || profile.email.split('@')[0], body);
    setBusy(false);
    if (r.ok) { setBody(''); setMsg(''); reload(); }
    else setMsg(r.message);
  };

  if (notFound) return <div className="container-x py-10"><EmptyState title="帖子不存在或已被移除" /></div>;
  if (!post || !comments) return <Spinner text="正在加载讨论" />;

  return (
    <div className="container-x max-w-3xl py-10">
      <Link to="/forum" className="text-sm text-slate-500 hover:text-brand-600">← 返回讨论区</Link>

      <article className="card mt-4 p-6">
        <div className="flex items-center gap-3">
          <Avatar name={post.author} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${TAG_COLORS[post.tag] || TAG_COLORS['闲聊灌水']}`}>{post.tag}</span>
              <h1 className="text-lg font-bold leading-7 text-brand-950">{post.title}</h1>
            </div>
            <p className="mt-1 text-xs text-slate-400">{post.author} · {fmtTime(post.createdAt)}</p>
          </div>
          {canManage(post.userId) && (
            <button
              className="btn-ghost text-xs text-red-600"
              onClick={async () => {
                if (!window.confirm('确定删除这条讨论及其全部评论吗？')) return;
                await deletePost(post.id);
                navigate('/forum');
              }}
            >
              删除
            </button>
          )}
        </div>
        <div className="mt-5 whitespace-pre-wrap border-t border-slate-100 pt-5 text-[15px] leading-8 text-slate-800">{post.body}</div>
      </article>

      <h2 className="mb-4 mt-10 text-base font-semibold text-slate-900">{comments.length} 条评论</h2>
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="card flex items-start gap-3 p-4">
            <Avatar name={c.author} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400">{c.author} · {fmtTime(c.createdAt)}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">{c.body}</p>
            </div>
            {canManage(c.userId) && (
              <button className="btn-ghost text-xs text-red-600" onClick={async () => { await deleteComment(c.id); reload(); }}>
                删除
              </button>
            )}
          </div>
        ))}
        {comments.length === 0 && <p className="py-6 text-center text-sm text-slate-400">还没有评论，来抢沙发</p>}
      </div>

      <div className="card mt-6 p-5">
        {profile ? (
          <>
            <textarea className="input min-h-[90px] resize-y" placeholder="写下你的看法…" value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-red-600">{msg}</p>
              <button className="btn-primary" disabled={busy || !body.trim()} onClick={onComment}>
                {busy ? '发表中…' : '发表评论'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            <Link to="/auth/login" className="text-brand-600 hover:underline">登录</Link> 后即可参与评论
          </p>
        )}
      </div>
    </div>
  );
}
