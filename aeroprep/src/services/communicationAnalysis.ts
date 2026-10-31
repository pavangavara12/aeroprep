import type { LiveTurn, LocalCommMetrics, WordCount } from '../types';

/* ==========================================================================
   communicationAnalysis.ts — DETERMINISTIC, local-only metrics.

   Everything here is measured directly from the transcript with plain string
   math: no AI, no network, no fabrication. These are the numbers we can state
   as fact ("you said 'like' 6 times"). The qualitative 0-100 scores live in
   coachAnalysis.ts and are clearly labeled AI-generated instead.

   Pure and synchronous, so it is trivially unit-testable.
   ========================================================================== */

/** Multi-word fillers must be matched before single tokens are counted. */
const PHRASE_FILLERS = ['you know', 'i mean', 'sort of', 'kind of'];

/** Single-word fillers. Some (so/like/actually) are context-dependent — the
 *  UI notes this — but the spec asks for them to be counted, so we do. */
const WORD_FILLERS = [
  'um', 'umm', 'uh', 'uhh', 'er', 'erm', 'ah',
  'like', 'actually', 'basically', 'so', 'literally', 'right',
];

/** Function words excluded when surfacing "overused" content words. */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'so', 'of', 'to', 'in',
  'on', 'at', 'for', 'with', 'as', 'by', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'am', 'do', 'does', 'did', 'have', 'has', 'had', 'i', 'you',
  'he', 'she', 'it', 'we', 'they', 'me', 'my', 'your', 'his', 'her', 'its',
  'our', 'their', 'this', 'that', 'these', 'those', 'not', 'no', 'yes', 'can',
  'will', 'would', 'should', 'could', 'about', 'just', 'because', 'what', 'when',
  'where', 'who', 'how', 'why', 'which', 'there', 'here', 'from', 'up', 'out',
  'get', 'got', 'im', 'ive', 'youre', 'thats', 'dont', 'really', 'very', 'more',
  'some', 'them', 'than', 'into', 'also', 'like', 'well', 'okay', 'ok',
]);

const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9']+/g) ?? [];

const countPhrase = (haystack: string, phrase: string): number => {
  const re = new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'g');
  return (haystack.match(re) ?? []).length;
};

/** Compute every local metric for one session's transcript. */
export function computeLocalMetrics(turns: LiveTurn[], sessionSeconds: number): LocalCommMetrics {
  const userTexts = turns.filter((t) => t.role === 'you').map((t) => t.text.trim()).filter(Boolean);
  const joined = ' ' + userTexts.join(' \n ').toLowerCase() + ' ';

  const perTurnCounts = userTexts.map((t) => tokenize(t).length);
  const totalUserWords = perTurnCounts.reduce((s, n) => s + n, 0);
  const userTurns = userTexts.length;
  const avgWordsPerTurn = userTurns ? Math.round(totalUserWords / userTurns) : 0;
  const longestTurnWords = perTurnCounts.length ? Math.max(...perTurnCounts) : 0;
  const shortestTurnWords = perTurnCounts.length ? Math.min(...perTurnCounts) : 0;

  // ---- Filler detection -------------------------------------------------
  // Count phrases first, then remove them so their component words aren't
  // double-counted as single-word fillers.
  const fillerCounts = new Map<string, number>();
  let scrubbed = joined;
  for (const phrase of PHRASE_FILLERS) {
    const n = countPhrase(scrubbed, phrase);
    if (n > 0) fillerCounts.set(phrase, n);
    scrubbed = scrubbed.replace(new RegExp(`\\b${phrase.replace(/ /g, '\\s+')}\\b`, 'g'), ' ');
  }
  const scrubbedTokens = tokenize(scrubbed);
  const wordFillerSet = new Set(WORD_FILLERS);
  for (const tok of scrubbedTokens) {
    if (wordFillerSet.has(tok)) fillerCounts.set(tok, (fillerCounts.get(tok) ?? 0) + 1);
  }
  const fillerByWord: WordCount[] = [...fillerCounts.entries()]
    .map(([word, count]) => ({ word, count }))
    .filter((w) => w.count > 0)
    .sort((a, b) => b.count - a.count);
  const fillerTotal = fillerByWord.reduce((s, w) => s + w.count, 0);
  const fillerPerHundredWords =
    totalUserWords > 0 ? Math.round((fillerTotal / totalUserWords) * 1000) / 10 : 0;

  // ---- Overused (repeated) content words --------------------------------
  const contentCounts = new Map<string, number>();
  for (const tok of tokenize(joined)) {
    if (tok.length < 4) continue; // skip tiny words
    if (STOPWORDS.has(tok) || wordFillerSet.has(tok)) continue;
    contentCounts.set(tok, (contentCounts.get(tok) ?? 0) + 1);
  }
  const repeatedWords: WordCount[] = [...contentCounts.entries()]
    .map(([word, count]) => ({ word, count }))
    .filter((w) => w.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const pacePerSessionMinute =
    sessionSeconds > 0 ? Math.round(totalUserWords / (sessionSeconds / 60)) : 0;

  return {
    userTurns,
    totalUserWords,
    avgWordsPerTurn,
    longestTurnWords,
    shortestTurnWords,
    fillerTotal,
    fillerPerHundredWords,
    fillerByWord,
    repeatedWords,
    sessionSeconds,
    pacePerSessionMinute,
  };
}

/** Enough of a conversation to be worth analyzing? Keeps noise/empty sessions
 *  from producing a meaningless report. */
export function hasEnoughToAnalyze(metrics: LocalCommMetrics): boolean {
  return metrics.userTurns >= 1 && metrics.totalUserWords >= 12;
}
