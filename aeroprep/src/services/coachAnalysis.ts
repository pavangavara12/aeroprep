import type {
  AiCoachReport,
  CoachModeId,
  CommScores,
  LiveTurn,
  LocalCommMetrics,
  StructureAnalysis,
} from '../types';
import { extractJson, generateReply } from './aiService';

/* ==========================================================================
   coachAnalysis.ts — the AI-GENERATED half of the session report.

   The model receives the transcript PLUS the locally-measured metrics (so it
   can reference real filler counts instead of inventing them) and returns
   qualitative 0-100 judgments and coaching notes. Every field is defensively
   parsed and clamped; if the AI/server is unavailable, the caller falls back
   to showing the measured metrics alone. These scores are always presented in
   the UI as "AI-generated", never as exact measurements.
   ========================================================================== */

const clampScore = (n: unknown, fallback = 50): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, Math.round(v)));
};

const asStringList = (v: unknown, max = 5): string[] =>
  Array.isArray(v)
    ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => String(x).trim()).slice(0, max)
    : [];

/** Interview-style modes lean on STAR; open-ended modes use a general shape. */
const STAR_MODES = new Set<CoachModeId>(['interview', 'hr', 'technical']);

const ANALYSIS_SYSTEM = `You are a rigorous, supportive communication coach analyzing a practice conversation between a user ("YOU") and an AI coach ("COACH"). Judge ONLY the user's speech. Be honest and specific — never inflate scores or invent praise. Where measured stats are provided (word counts, filler counts), treat them as ground truth and do not contradict them.

Return ONLY valid JSON (no markdown, no commentary) with EXACTLY this shape:
{
  "scores": {"clarity":0-100,"fluency":0-100,"grammar":0-100,"vocabulary":0-100,"structure":0-100,"confidence":0-100},
  "overall": 0-100,
  "summary": "one or two plain sentences",
  "strengths": ["short specific item", ...],
  "areasToImprove": ["short specific item", ...],
  "grammarObservations": ["short note with a better phrasing", ...],
  "vocabularySuggestions": ["short suggestion", ...],
  "structure": {"framework":"STAR" or "General","present":["..."],"missing":["..."],"note":"one sentence"},
  "recommendedExercises": ["short actionable drill", ...]
}
Guidance: "confidence" judges how assertive/self-assured the WORDING is (hedging and filler lower it), not the person. Keep every list to at most 5 concise items. For interview/behavioral answers use framework "STAR" with components Situation, Task, Action, Result; otherwise use "General" with components Opening, Main point, Supporting details, Conclusion. List which components were present vs missing.`;

function buildTranscript(turns: LiveTurn[]): string {
  const lines = turns
    .filter((t) => t.text && t.text.trim())
    .map((t) => `${t.role === 'you' ? 'YOU' : 'COACH'}: ${t.text.trim()}`);
  // Keep the prompt bounded: last ~60 turns, capped at ~6000 chars.
  let out = lines.slice(-60).join('\n');
  if (out.length > 6000) out = out.slice(out.length - 6000);
  return out;
}

function metricsNote(m: LocalCommMetrics): string {
  const top = m.fillerByWord.slice(0, 4).map((f) => `"${f.word}" ${f.count}`).join(', ') || 'none detected';
  return [
    `Measured (ground truth): the user spoke ${m.userTurns} time(s), ${m.totalUserWords} words total`,
    `(avg ${m.avgWordsPerTurn}/turn, longest ${m.longestTurnWords}).`,
    `Filler words total ${m.fillerTotal} (${m.fillerPerHundredWords} per 100 words); breakdown: ${top}.`,
    `Session length ${m.sessionSeconds}s.`,
  ].join(' ');
}

function normalize(raw: Partial<AiCoachReport> | null): AiCoachReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = (raw.scores ?? {}) as Partial<CommScores>;
  const scores: CommScores = {
    clarity: clampScore(s.clarity),
    fluency: clampScore(s.fluency),
    grammar: clampScore(s.grammar),
    vocabulary: clampScore(s.vocabulary),
    structure: clampScore(s.structure),
    confidence: clampScore(s.confidence),
  };
  const avg = Math.round(
    (scores.clarity + scores.fluency + scores.grammar + scores.vocabulary + scores.structure + scores.confidence) / 6,
  );
  const st = (raw.structure ?? {}) as Partial<StructureAnalysis>;
  const structure: StructureAnalysis = {
    framework: st.framework === 'STAR' ? 'STAR' : 'General',
    present: asStringList(st.present, 6),
    missing: asStringList(st.missing, 6),
    note: typeof st.note === 'string' ? st.note.trim() : '',
  };
  return {
    scores,
    overall: clampScore(raw.overall, avg),
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    strengths: asStringList(raw.strengths),
    areasToImprove: asStringList(raw.areasToImprove),
    grammarObservations: asStringList(raw.grammarObservations),
    vocabularySuggestions: asStringList(raw.vocabularySuggestions),
    structure,
    recommendedExercises: asStringList(raw.recommendedExercises),
  };
}

/**
 * Request the AI coaching report for a finished session. Returns null when the
 * server is unavailable or the response can't be parsed — the caller then shows
 * the measured metrics alone with an honest "AI feedback unavailable" note.
 */
export async function requestCoachReport(
  turns: LiveTurn[],
  mode: CoachModeId,
  modeLabel: string,
  metrics: LocalCommMetrics,
  signal?: AbortSignal,
): Promise<AiCoachReport | null> {
  const transcript = buildTranscript(turns);
  if (!transcript) return null;

  const framework = STAR_MODES.has(mode) ? 'STAR' : 'General';
  const prompt = `Practice mode: ${modeLabel} (prefer framework: ${framework}).
${metricsNote(metrics)}

TRANSCRIPT:
${transcript}

Analyze the user's communication now and return the JSON.`;

  try {
    const text = await generateReply([{ role: 'user', text: prompt }], ANALYSIS_SYSTEM, {
      temperature: 0.3,
      signal,
    });
    return normalize(extractJson<Partial<AiCoachReport>>(text));
  } catch {
    return null;
  }
}
