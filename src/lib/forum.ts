import { supabase, isCloudEnabled } from './supabase';

export interface ForumPost {
  id: string;
  userId: string;
  author: string;
  title: string;
  body: string;
  tag: string;
  createdAt: string;
  commentCount: number;
}

export interface ForumComment {
  id: string;
  postId: string;
  userId: string;
  author: string;
  body: string;
  createdAt: string;
}

export const FORUM_TAGS = ['学习交流', '产品建议', '问题反馈', '晒单分享', '闲聊灌水'] as const;

const LS_POSTS = 'seoc.local.forumPosts';
const LS_COMMENTS = 'seoc.local.forumComments';

function readLocal<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
}

function newId() {
  return 'lf-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function listPosts(tag?: string): Promise<ForumPost[]> {
  if (isCloudEnabled && supabase) {
    let query = supabase
      .from('forum_posts')
      .select('id, user_id, title, body, tag, created_at, profiles(nickname, email), forum_comments(count)')
      .order('created_at', { ascending: false });
    if (tag) query = query.eq('tag', tag);
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      author: (r.profiles as unknown as { nickname: string; email: string })?.nickname
        || (r.profiles as unknown as { email: string })?.email?.split('@')[0]
        || '用户',
      title: r.title,
      body: r.body,
      tag: r.tag,
      createdAt: r.created_at,
      commentCount: (r.forum_comments as unknown as { count: number }[])?.[0]?.count || 0
    }));
  }
  const comments = readLocal<ForumComment>(LS_COMMENTS);
  return readLocal<ForumPost>(LS_POSTS)
    .filter((p) => !tag || p.tag === tag)
    .map((p) => ({ ...p, commentCount: comments.filter((c) => c.postId === p.id).length }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPost(id: string): Promise<ForumPost | null> {
  if (isCloudEnabled && supabase) {
    const { data: r, error } = await supabase
      .from('forum_posts')
      .select('id, user_id, title, body, tag, created_at, profiles(nickname, email), forum_comments(count)')
      .eq('id', id)
      .maybeSingle();
    if (error || !r) return null;
    return {
      id: r.id,
      userId: r.user_id,
      author: (r.profiles as unknown as { nickname: string; email: string })?.nickname
        || (r.profiles as unknown as { email: string })?.email?.split('@')[0]
        || '用户',
      title: r.title,
      body: r.body,
      tag: r.tag,
      createdAt: r.created_at,
      commentCount: (r.forum_comments as unknown as { count: number }[])?.[0]?.count || 0
    };
  }
  const post = readLocal<ForumPost>(LS_POSTS).find((p) => p.id === id);
  if (!post) return null;
  return { ...post, commentCount: readLocal<ForumComment>(LS_COMMENTS).filter((c) => c.postId === id).length };
}

export async function createPost(userId: string, author: string, title: string, body: string, tag: string): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!title.trim() || !body.trim()) return { ok: false, message: '标题与正文不能为空' };
  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase
      .from('forum_posts')
      .insert({ user_id: userId, title: title.trim(), body: body.trim(), tag })
      .select('id')
      .single();
    if (error) return { ok: false, message: `发布失败：${error.message}` };
    return { ok: true, message: '发布成功', id: data.id };
  }
  const posts = readLocal<ForumPost>(LS_POSTS);
  const id = newId();
  posts.push({ id, userId, author, title: title.trim(), body: body.trim(), tag, createdAt: new Date().toISOString(), commentCount: 0 });
  writeLocal(LS_POSTS, posts);
  return { ok: true, message: '发布成功（本地模式）', id };
}

export async function deletePost(id: string): Promise<boolean> {
  if (isCloudEnabled && supabase) {
    const { error } = await supabase.from('forum_posts').delete().eq('id', id);
    return !error;
  }
  writeLocal(LS_POSTS, readLocal<ForumPost>(LS_POSTS).filter((p) => p.id !== id));
  writeLocal(LS_COMMENTS, readLocal<ForumComment>(LS_COMMENTS).filter((c) => c.postId !== id));
  return true;
}

export async function listComments(postId: string): Promise<ForumComment[]> {
  if (isCloudEnabled && supabase) {
    const { data, error } = await supabase
      .from('forum_comments')
      .select('id, post_id, user_id, body, created_at, profiles(nickname, email)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) return [];
    return (data || []).map((r) => ({
      id: r.id,
      postId: r.post_id,
      userId: r.user_id,
      author: (r.profiles as unknown as { nickname: string; email: string })?.nickname
        || (r.profiles as unknown as { email: string })?.email?.split('@')[0]
        || '用户',
      body: r.body,
      createdAt: r.created_at
    }));
  }
  return readLocal<ForumComment>(LS_COMMENTS).filter((c) => c.postId === postId);
}

export async function createComment(postId: string, userId: string, author: string, body: string): Promise<{ ok: boolean; message: string }> {
  if (!body.trim()) return { ok: false, message: '评论内容不能为空' };
  if (isCloudEnabled && supabase) {
    const { error } = await supabase.from('forum_comments').insert({ post_id: postId, user_id: userId, body: body.trim() });
    if (error) return { ok: false, message: `评论失败：${error.message}` };
    return { ok: true, message: '评论成功' };
  }
  const comments = readLocal<ForumComment>(LS_COMMENTS);
  comments.push({ id: newId(), postId, userId, author, body: body.trim(), createdAt: new Date().toISOString() });
  writeLocal(LS_COMMENTS, comments);
  return { ok: true, message: '评论成功（本地模式）' };
}

export async function deleteComment(id: string): Promise<boolean> {
  if (isCloudEnabled && supabase) {
    const { error } = await supabase.from('forum_comments').delete().eq('id', id);
    return !error;
  }
  writeLocal(LS_COMMENTS, readLocal<ForumComment>(LS_COMMENTS).filter((c) => c.id !== id));
  return true;
}
