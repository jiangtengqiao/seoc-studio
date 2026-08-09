import { isCloudEnabled, supabase } from './supabase';

export interface LatestAssessment {
  date: string;
  total: number;
  max: number;
  perDim: Record<string, { got: number; all: number }>;
}

function readLocalLatest(userId: string): LatestAssessment | null {
  try {
    const list = JSON.parse(localStorage.getItem(`seoc.assess.${userId}`) || '[]');
    return list[0] || null;
  } catch {
    return null;
  }
}

export async function fetchLatestAssessment(userId: string): Promise<LatestAssessment | null> {
  if (isCloudEnabled && supabase) {
    const { data } = await supabase
      .from('assessments')
      .select('created_at, result')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const result = data.result as Omit<LatestAssessment, 'date'>;
      return { date: data.created_at as string, ...result };
    }
  }
  return readLocalLatest(userId);
}
