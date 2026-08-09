import { isCloudEnabled, supabase } from './supabase';

export interface Inquiry {
  id: string;
  user_id: string;
  email: string;
  kind: 'purchase' | 'consult' | 'question';
  product_slug: string | null;
  message: string;
  status: 'open' | 'replied' | 'closed';
  reply: string | null;
  created_at: string;
  replied_at: string | null;
}

const lsKey = (uid: string) => `seoc.inquiries.${uid}`;

function loadLocal(uid: string): Inquiry[] {
  try {
    return JSON.parse(localStorage.getItem(lsKey(uid)) || '[]');
  } catch {
    return [];
  }
}

export async function submitInquiry(input: {
  userId: string;
  email: string;
  kind: Inquiry['kind'];
  productSlug?: string;
  message: string;
}): Promise<string | null> {
  if (isCloudEnabled && supabase) {
    const { error } = await supabase.from('inquiries').insert({
      user_id: input.userId,
      email: input.email,
      kind: input.kind,
      product_slug: input.productSlug || null,
      message: input.message
    });
    return error ? error.message : null;
  }
  const list = loadLocal(input.userId);
  list.unshift({
    id: 'local-' + Date.now(),
    user_id: input.userId,
    email: input.email,
    kind: input.kind,
    product_slug: input.productSlug || null,
    message: input.message,
    status: 'open',
    reply: null,
    created_at: new Date().toISOString(),
    replied_at: null
  });
  localStorage.setItem(lsKey(input.userId), JSON.stringify(list));
  return null;
}

export async function fetchMyInquiries(userId: string): Promise<Inquiry[]> {
  if (isCloudEnabled && supabase) {
    const { data } = await supabase
      .from('inquiries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) return data as Inquiry[];
  }
  return loadLocal(userId);
}

export async function fetchAllInquiries(): Promise<Inquiry[]> {
  if (isCloudEnabled && supabase) {
    const { data } = await supabase
      .from('inquiries')
      .select('*')
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });
    if (data) return data as Inquiry[];
  }
  return [];
}

export async function replyInquiry(id: string, reply: string): Promise<string | null> {
  if (!isCloudEnabled || !supabase) return '演示模式不支持';
  const { error } = await supabase
    .from('inquiries')
    .update({ reply, status: 'replied', replied_at: new Date().toISOString() })
    .eq('id', id);
  return error ? error.message : null;
}
