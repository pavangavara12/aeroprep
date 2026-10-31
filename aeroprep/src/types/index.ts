export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ScenarioNode {
  id: string;
  text: string;
  speaker?: string;
  options: ScenarioOption[];
}

export interface ScenarioOption {
  text: string;
  nextNodeId: string;
  moraleChange: number;
  trustChange: number;
  deliveryChange: number;
  feedback: string;
}

export interface BodyLanguageCard {
  id: string;
  gesture: string;
  meaning: string;
  context: string;
  tip: string;
}

export interface StarResponse {
  situation: string;
  task: string;
  action: string;
  result: string;
  savedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
}

export interface InterviewSession {
  role: 'HR' | 'Tech';
  messages: ChatMessage[];
  currentQuestionIndex: number;
  feedback?: {
    overallScore: number;
    positives: string[];
    improvements: string[];
  };
}

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  role?: 'student' | 'admin';
  signedInAt?: string;
  avatar?: string;
  college?: string;
  branch?: string;
  gradYear?: string;
  targetRole?: string;
  targetCompanies?: string[];
  bio?: string;
}

export interface UserProgress {
  totalScore: number;
  streak: number;
  lastActiveDate: string;
  completedLessons: string[];
  quizScores: Record<string, number>;
  savedStarResponses: Record<string, StarResponse>;
}

/* ==========================================================================
   AI Voice Assistant / AI Interviewer / AI Coach
   Appended for the voice feature. Existing types above are unchanged.
   NOTE: no TS `enum` here — the project uses erasableSyntaxOnly, so states
   are string-literal unions / const objects instead.
   ========================================================================== */

/** Explicit conversation state machine (no race conditions). */
export type AssistantState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'paused'
  | 'error'
  | 'completed';

/** Which top-level module the user is currently in (for context-aware Coach). */
export type AppModule = 'dashboard' | 'communication' | 'softskills' | 'aptitude' | 'mock';

/** Server AI health (from GET /api/health). */
export interface AiHealth {
  ok: boolean;
  configured: boolean;
  models?: { text: string; stt: string; tts: string; voice: string };
  live?: { model: string; voice: string; apiVersion: string };
}

// AI_TYPES_APPEND

/** Interview configuration chosen before an AI interview starts. */
export type InterviewType = 'technical' | 'hr' | 'behavioral' | 'communication' | 'mixed';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard';

export interface InterviewConfig {
  type: InterviewType;
  jobRole?: string;
  experienceLevel?: string;
  skills?: string;
  company?: string;
  difficulty: InterviewDifficulty;
  questionCount: number;
}

/**
 * Speech metrics we can measure RELIABLY in the browser:
 * recording duration (timed), word count + fillers (from transcript), and
 * WPM (derived). We deliberately do not fabricate pause/prosody metrics.
 */
export interface SpeechMetrics {
  wordCount: number;
  durationSec: number;
  wordsPerMinute: number;
  fillerCount: number;
  fillerWords: string[];
}

/** Per-answer evaluation returned by the model (all scores 0-100). */
export interface AnswerEvaluation {
  relevance: number;
  clarity: number;
  completeness: number;
  confidence: number;
  structure: number;
  overall: number;
  strengths: string[];
  improvements: string[];
  feedback: string;
}

/** One line in the interview transcript. */
export interface InterviewTurn {
  id: string;
  role: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  viaVoice?: boolean;
  metrics?: SpeechMetrics;
  evaluation?: AnswerEvaluation;
}

/** End-of-interview summary. paceWpm is null when no voice answers were given. */
export interface InterviewSummary {
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  relevanceScore: number;
  confidenceScore: number;
  paceWpm: number | null;
  totalFillerCount: number;
  strengths: string[];
  improvements: string[];
  recommendedTopics: string[];
  perQuestion: Array<{ question: string; answer: string; evaluation?: AnswerEvaluation }>;
  closingRemark: string;
}

/** AI Coach chat. */
export type CoachRole = 'user' | 'assistant';
export interface CoachMessage {
  id: string;
  role: CoachRole;
  text: string;
  timestamp: string;
}

/* ==========================================================================
   Gemini LIVE API — real-time Communication Coach (WebSocket, native audio).
   Added 2026-09. The Live path is separate from the REST voice assistant
   above; it streams mic PCM up and native-audio PCM down over a WebSocket
   opened with a short-lived ephemeral token (key stays server-side).
   ========================================================================== */

/** Explicit Live-session state machine surfaced in the Coach UI. */
export type LiveCoachState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'reconnecting'
  | 'error'
  | 'ended';

/** The practice modes the coach can run (each maps to a system-instruction preset). */
export type CoachModeId =
  | 'free'
  | 'interview'
  | 'hr'
  | 'technical'
  | 'public'
  | 'impromptu'
  | 'workplace';

export interface CoachMode {
  id: CoachModeId;
  label: string;
  blurb: string;
  /** Extra guidance appended to the base coach system instruction. */
  instruction: string;
  /** What the coach says first when the session starts. */
  opener: string;
}

/** Shape returned by POST /api/live-token (contains NO API key). */
export interface LiveTokenResponse {
  token: string;
  wsUrl: string;
  model: string;
  voice: string;
  apiVersion: string;
  expiresAt: string;
  connectBy: string;
}

/** One completed exchange in the live conversation history. */
export interface LiveTurn {
  id: string;
  role: 'you' | 'coach';
  text: string;
  timestamp: string;
}

/** Dev-only diagnostics for the debug panel (no secrets). */
export interface LiveDebugStats {
  connection: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'closed';
  audioContext: 'none' | 'suspended' | 'running' | 'closed';
  micActive: boolean;
  inputSampleRate: number | null;
  outputSampleRate: number;
  receivedChunks: number;
  playedChunks: number;
  queuedChunks: number;
  lastMimeType: string;
  lastEvent: string;
}

/* ==========================================================================
   Communication analysis · session report · local progress (Live coach).
   IMPORTANT honesty rule: `LocalCommMetrics` are MEASURED deterministically
   from the transcript (filler counts, word counts, duration). `CommScores`
   and the narrative report are AI-GENERATED judgments and are always labeled
   as such in the UI — never presented as exact measurements.
   ========================================================================== */

/** A word paired with how many times it occurred (fillers / repeated words). */
export interface WordCount {
  word: string;
  count: number;
}

/** Deterministic, locally-computed metrics — no AI, no fabrication. */
export interface LocalCommMetrics {
  userTurns: number;
  totalUserWords: number;
  avgWordsPerTurn: number;
  longestTurnWords: number;
  shortestTurnWords: number;
  fillerTotal: number;
  fillerPerHundredWords: number;
  fillerByWord: WordCount[]; // sorted desc, only entries with count > 0
  repeatedWords: WordCount[]; // overused content words (count >= 3), sorted desc
  sessionSeconds: number;
  pacePerSessionMinute: number; // totalUserWords / (sessionSeconds/60) — whole-session pace
}

/** 0-100 qualitative scores. AI-GENERATED judgments, not measurements. */
export interface CommScores {
  clarity: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  structure: number;
  confidence: number;
}

/** Structure analysis — STAR for interview-style answers, general otherwise. */
export interface StructureAnalysis {
  framework: 'STAR' | 'General';
  present: string[];
  missing: string[];
  note: string;
}

/** The AI-generated coaching report for one completed session. */
export interface AiCoachReport {
  scores: CommScores;
  overall: number; // 0-100
  summary: string;
  strengths: string[];
  areasToImprove: string[];
  grammarObservations: string[];
  vocabularySuggestions: string[];
  structure: StructureAnalysis;
  recommendedExercises: string[];
}

/** A recorded practice session, persisted to localStorage for progress. */
export interface CoachSessionRecord {
  id: string;
  dateISO: string;
  mode: CoachModeId;
  modeLabel: string;
  durationSec: number;
  metrics: LocalCommMetrics;
  scores: CommScores | null; // null when the AI report was unavailable
  overall: number | null;
}

/* ==========================================================================
   Technical Prep, Coding Practice, Resume & Placement Types
   ========================================================================== */

export interface TechnicalTopic {
  id: string;
  category: string;
  categoryLabel: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  readTimeMin: number;
  summary: string;
  keyConcepts: string[];
  codeSnippet: string;
  practiceQuestions: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
}

export interface CodingTestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface CodingProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  starterCode: {
    python: string;
    java: string;
    cpp: string;
    c: string;
  };
  testCases: CodingTestCase[];
}

export interface CodingSubmission {
  id: string;
  userId: string;
  userName: string;
  problemId: string;
  problemTitle: string;
  language: string;
  code: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Compilation Error' | 'Runtime Error';
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  memoryKb: number;
  submittedAt: string;
}

export interface ResumeAnalysis {
  id: string;
  userId: string;
  fileName: string;
  targetRole: string;
  overallScore: number;
  breakdown: {
    skillsMatch: number;
    projectImpact: number;
    formatting: number;
    experience: number;
  };
  detectedSkills: string[];
  missingSkills: string[];
  suggestions: string[];
  analyzedAt: string;
}

export interface TargetCompany {
  id: string;
  name: string;
  role: string;
  status: 'Researching' | 'Preparing' | 'Applied' | 'Interviewing' | 'Offer Received';
  rounds: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface PlacementTrackerData {
  userId: string;
  targetCompanies: TargetCompany[];
  checklist: ChecklistItem[];
  weeklyGoal: {
    targetProblems: number;
    solvedProblems: number;
    targetMocks: number;
    completedMocks: number;
  };
  readinessScore: number;
}

export interface AdminStats {
  usersCount: number;
  problemsCount: number;
  submissionsCount: number;
  interviewsCount: number;
  aptitudeAttemptsCount: number;
  resumesCount: number;
  acceptanceRate: number;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    college?: string;
    targetRole?: string;
    createdAt: string;
  }>;
  recentSubmissions: CodingSubmission[];
  recentInterviews: Array<{
    id: string;
    userName: string;
    type: string;
    jobRole: string;
    overallScore: number;
    createdAt: string;
  }>;
}
