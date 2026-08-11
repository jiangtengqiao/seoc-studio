import { supabase, isCloudEnabled } from './supabase';
import uxResearchV2 from '../content/surveys/ux-research-v2.md?raw';

export type QuestionKind = 'single' | 'multi' | 'ranking' | 'text';

export interface SurveyQuestion {
  id: string;
  kind: QuestionKind;
  text: string;
  options: string[];
  optional: boolean;
}

export interface SurveySection {
  id: string;
  title: string;
  desc: string;
  questions: SurveyQuestion[];
}

export interface SurveyDef {
  slug: string;
  title: string;
  intro: string[];
  sections: SurveySection[];
  appendix: string;
  sourceMd: string;
}

export interface SurveyMeta {
  slug: string;
  title: string;
  questionCount: number;
  sectionCount: number;
  builtin: boolean;
  status: 'published' | 'draft' | 'closed';
  createdAt: string;
  cloudId?: string;
  responseCount?: number;
}

export type SurveyAnswers = Record<string, string | string[]>;

export interface SurveyResponseRow {
  id: string;
  surveySlug: string;
  answers: SurveyAnswers;
  createdAt: string;
}

const CN_NUM = '一二三四五六七八九十';
const SECTION_RE = new RegExp(`^([${CN_NUM}]+)、\\s*(.+)$`);
const KIND_RE = /（(单选|多选|排序题|开放填空)）\s*$/;

const KIND_MAP: Record<string, QuestionKind> = {
  单选: 'single',
  多选: 'multi',
  排序题: 'ranking',
  开放填空: 'text'
};

/**
 * 把问卷 Markdown 解析为结构化定义。
 * 约定格式：中文数字+顿号开头为分节；题目行以（单选/多选/排序题/开放填空）结尾；
 * 缩进行为选项；以问号结尾且无类型的行视为开放题；💡 起为内部附录（不向用户展示）。
 */
export function parseSurveyMarkdown(md: string, slug = ''): SurveyDef {
  const def: SurveyDef = { slug, title: '', intro: [], sections: [], appendix: '', sourceMd: md };
  let section: SurveySection | null = null;
  let question: SurveyQuestion | null = null;
  let inAppendix = false;
  let qSeq = 0;
  let sSeq = 0;

  const closeQuestion = () => {
    if (section && question) section.questions.push(question);
    question = null;
  };

  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    if (!inAppendix && (line.startsWith('💡') || line.includes('问卷设计说明'))) {
      closeQuestion();
      inAppendix = true;
      continue;
    }
    if (inAppendix) {
      def.appendix += (def.appendix ? '\n' : '') + line;
      continue;
    }

    const secMatch = line.match(SECTION_RE);
    if (secMatch) {
      closeQuestion();
      const rest = secMatch[2];
      const m = rest.match(/^(.*?（\d+\s*题[^）]*）)\s*(.*)$/);
      sSeq += 1;
      section = {
        id: `s${sSeq}`,
        title: m ? m[1].trim() : rest.trim(),
        desc: m ? m[2].trim() : '',
        questions: []
      };
      def.sections.push(section);
      continue;
    }

    if (!section) {
      if (!def.title) def.title = line;
      else def.intro.push(line);
      continue;
    }

    const kindMatch = line.match(KIND_RE);
    const isIndented = /^\s/.test(raw);
    if (isIndented && question && !kindMatch) {
      question.options.push(line);
      continue;
    }
    if (kindMatch) {
      closeQuestion();
      qSeq += 1;
      const kind = KIND_MAP[kindMatch[1]];
      question = {
        id: `q${qSeq}`,
        kind,
        text: line.replace(KIND_RE, '').trim(),
        options: [],
        optional: kind === 'text' && /选填/.test(section.title)
      };
      continue;
    }
    if (/[？?]\s*$/.test(line)) {
      closeQuestion();
      qSeq += 1;
      question = {
        id: `q${qSeq}`,
        kind: 'text',
        text: line,
        options: [],
        optional: /选填/.test(section.title)
      };
      continue;
    }
    section.desc += (section.desc ? ' ' : '') + line;
  }
  closeQuestion();
  return def;
}

/** 内置问卷（始终可用，云端同 slug 版本优先） */
export const BUILTIN_SURVEYS: SurveyDef[] = [parseSurveyMarkdown(uxResearchV2, 'ux-research-v2')];

export function questionCountOf(def: SurveyDef): number {
  return def.sections.reduce((n, s) => n + s.questions.length, 0);
}

function metaOf(def: SurveyDef, extra?: Partial<SurveyMeta>): SurveyMeta {
  return {
    slug: def.slug,
    title: def.title,
    questionCount: questionCountOf(def),
    sectionCount: def.sections.length,
    builtin: true,
    status: 'published',
    createdAt: '',
    ...extra
  };
}

/* ---------------- 云端 / 本地读取 ---------------- */

const LS_SURVEYS = 'seoc.local.surveys';
const LS_RESPONSES = 'seoc.local.surveyResponses';

interface LocalSurveyRow {
  slug: string;
  def: SurveyDef;
  status: 'published' | 'draft' | 'closed';
  createdAt: string;
}

function readLocalSurveys(): LocalSurveyRow[] {
  try {
    return JSON.parse(localStorage.getItem(LS_SURVEYS) || '[]');
  } catch {
    return [];
  }
}

function writeLocalSurveys(rows: LocalSurveyRow[]) {
  localStorage.setItem(LS_SURVEYS, JSON.stringify(rows));
}

function readLocalResponses(): { surveySlug: string; userId: string; answers: SurveyAnswers; createdAt: string }[] {
  try {
    return JSON.parse(localStorage.getItem(LS_RESPONSES) || '[]');
  } catch {
    return [];
  }
}

/** 问卷中心列表：内置 + 云端/本地下发合并，同 slug 云端优先 */
export async function listSurveys(): Promise<SurveyMeta[]> {
  const metas = new Map<string, SurveyMeta>();
  for (const def of BUILTIN_SURVEYS) metas.set(def.slug, metaOf(def));

  if (isCloudEnabled && supabase) {
    const [{ data: surveys }, { data: stats }] = await Promise.all([
      supabase.from('surveys').select('id, slug, title, content, status, created_at').eq('status', 'published'),
      supabase.from('survey_stats').select('slug, response_count')
    ]);
    const countMap = new Map((stats || []).map((s: { slug: string; response_count: number }) => [s.slug, s.response_count]));
    for (const row of surveys || []) {
      const content = row.content as SurveyDef;
      metas.set(row.slug, {
        slug: row.slug,
        title: row.title,
        questionCount: questionCountOf(content),
        sectionCount: content.sections?.length || 0,
        builtin: BUILTIN_SURVEYS.some((b) => b.slug === row.slug),
        status: row.status,
        createdAt: row.created_at,
        cloudId: row.id,
        responseCount: countMap.get(row.slug) || 0
      });
    }
  } else {
    for (const row of readLocalSurveys()) {
      if (row.status !== 'published') continue;
      metas.set(row.slug, metaOf(row.def, {
        builtin: BUILTIN_SURVEYS.some((b) => b.slug === row.slug),
        createdAt: row.createdAt,
        status: row.status
      }));
    }
  }
  return [...metas.values()];
}

/** 取问卷完整定义（云端同 slug 优先，其次内置/本地） */
export async function getSurvey(slug: string): Promise<SurveyDef | null> {
  if (isCloudEnabled && supabase) {
    const { data } = await supabase
      .from('surveys')
      .select('content, status')
      .eq('slug', slug)
      .neq('status', 'draft')
      .maybeSingle();
    if (data?.content) return { ...(data.content as SurveyDef), slug };
  } else {
    const local = readLocalSurveys().find((r) => r.slug === slug && r.status !== 'draft');
    if (local) return local.def;
  }
  return BUILTIN_SURVEYS.find((b) => b.slug === slug) || null;
}

/** 管理员发布/更新问卷（upsert by slug） */
export async function publishSurvey(def: SurveyDef, status: 'published' | 'draft' = 'published'): Promise<{ ok: boolean; message: string }> {
  if (!def.slug) return { ok: false, message: '缺少问卷标识 slug' };
  if (!def.title || def.sections.length === 0) return { ok: false, message: '解析结果为空，请检查问卷格式' };

  if (isCloudEnabled && supabase) {
    const { error } = await supabase.from('surveys').upsert(
      {
        slug: def.slug,
        title: def.title,
        intro: def.intro.join('\n'),
        content: def,
        source_md: def.sourceMd,
        status,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'slug' }
    );
    if (error) return { ok: false, message: `发布失败：${error.message}` };
    return { ok: true, message: '已发布到问卷中心' };
  }

  const rows = readLocalSurveys().filter((r) => r.slug !== def.slug);
  rows.push({ slug: def.slug, def, status, createdAt: new Date().toISOString() });
  writeLocalSurveys(rows);
  return { ok: true, message: '已发布（本地模式）' };
}

/** 管理员：列出云端全部问卷（含草稿与回收数） */
export async function adminListSurveys(): Promise<SurveyMeta[]> {
  if (isCloudEnabled && supabase) {
    const [{ data: surveys }, { data: stats }] = await Promise.all([
      supabase.from('surveys').select('id, slug, title, content, status, created_at').order('created_at', { ascending: false }),
      supabase.from('survey_stats').select('slug, response_count')
    ]);
    const countMap = new Map((stats || []).map((s: { slug: string; response_count: number }) => [s.slug, s.response_count]));
    return (surveys || []).map((row) => ({
      slug: row.slug,
      title: row.title,
      questionCount: questionCountOf(row.content as SurveyDef),
      sectionCount: (row.content as SurveyDef).sections?.length || 0,
      builtin: BUILTIN_SURVEYS.some((b) => b.slug === row.slug),
      status: row.status,
      createdAt: row.created_at,
      cloudId: row.id,
      responseCount: countMap.get(row.slug) || 0
    }));
  }
  return readLocalSurveys().map((r) => metaOf(r.def, { createdAt: r.createdAt, status: r.status, builtin: false }));
}

export async function setSurveyStatus(slug: string, status: 'published' | 'draft' | 'closed'): Promise<boolean> {
  if (isCloudEnabled && supabase) {
    const { error } = await supabase.from('surveys').update({ status, updated_at: new Date().toISOString() }).eq('slug', slug);
    return !error;
  }
  const rows = readLocalSurveys();
  const row = rows.find((r) => r.slug === slug);
  if (!row) return false;
  row.status = status;
  writeLocalSurveys(rows);
  return true;
}

/* ---------------- 答卷 ---------------- */

export async function getMyResponse(surveySlug: string, userId: string): Promise<SurveyResponseRow | null> {
  if (isCloudEnabled && supabase) {
    const { data: survey } = await supabase.from('surveys').select('id').eq('slug', surveySlug).maybeSingle();
    if (!survey) return null;
    const { data } = await supabase
      .from('survey_responses')
      .select('id, answers, created_at')
      .eq('survey_id', survey.id)
      .eq('user_id', userId)
      .maybeSingle();
    return data ? { id: data.id, surveySlug, answers: data.answers, createdAt: data.created_at } : null;
  }
  const row = readLocalResponses().find((r) => r.surveySlug === surveySlug && r.userId === userId);
  return row ? { id: `${row.surveySlug}-${row.userId}`, surveySlug, answers: row.answers, createdAt: row.createdAt } : null;
}

export async function submitResponse(surveySlug: string, userId: string, answers: SurveyAnswers): Promise<{ ok: boolean; message: string }> {
  if (isCloudEnabled && supabase) {
    let { data: survey } = await supabase.from('surveys').select('id').eq('slug', surveySlug).maybeSingle();
    if (!survey) {
      // 内置问卷首次提交时自动建档，便于统计回收数
      const builtin = BUILTIN_SURVEYS.find((b) => b.slug === surveySlug);
      if (!builtin) return { ok: false, message: '问卷不存在' };
      const { data: inserted, error } = await supabase
        .from('surveys')
        .insert({ slug: builtin.slug, title: builtin.title, intro: builtin.intro.join('\n'), content: builtin, source_md: builtin.sourceMd })
        .select('id')
        .single();
      if (error) return { ok: false, message: `提交失败：${error.message}` };
      survey = inserted;
    }
    const { error } = await supabase.from('survey_responses').insert({ survey_id: survey!.id, user_id: userId, answers });
    if (error) {
      if (error.code === '23505') return { ok: false, message: '您已提交过本问卷，每份问卷仅可作答一次' };
      return { ok: false, message: `提交失败：${error.message}` };
    }
    return { ok: true, message: '提交成功，感谢您的反馈' };
  }
  const rows = readLocalResponses();
  if (rows.some((r) => r.surveySlug === surveySlug && r.userId === userId)) {
    return { ok: false, message: '您已提交过本问卷，每份问卷仅可作答一次' };
  }
  rows.push({ surveySlug, userId, answers, createdAt: new Date().toISOString() });
  localStorage.setItem(LS_RESPONSES, JSON.stringify(rows));
  return { ok: true, message: '提交成功，感谢您的反馈（本地模式）' };
}

/** 管理员：导出某问卷全部答卷 */
export async function adminListResponses(surveySlug: string): Promise<{ email: string; answers: SurveyAnswers; createdAt: string }[]> {
  if (!(isCloudEnabled && supabase)) return [];
  const { data: survey } = await supabase.from('surveys').select('id').eq('slug', surveySlug).maybeSingle();
  if (!survey) return [];
  const { data } = await supabase
    .from('survey_responses')
    .select('answers, created_at, profiles(email)')
    .eq('survey_id', survey.id)
    .order('created_at', { ascending: false });
  return (data || []).map((r) => ({
    email: (r.profiles as unknown as { email: string })?.email || '未知用户',
    answers: r.answers as SurveyAnswers,
    createdAt: r.created_at
  }));
}
