import React, { useState, useEffect } from 'react';
import type { UserProgress } from '../types';
import { PlayIcon, CheckIcon, RefreshIcon, BookOpenIcon, XIcon, ClockIcon, SpeechIcon, HeartIcon, EyeIcon } from './Icons';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { SectionHero, SideNav, ProgressRing } from './Shared';
import type { SideNavItem } from './Shared';
import { SkillIllustration } from './graphics/SkillIllustration';

interface CommunicationProps {
  progress: UserProgress;
  onAddScore: (score: number) => void;
  onCompleteLesson: (lessonId: string) => void;
}

interface Article {
  id: string;
  title: string;
  category: string;
  readTimeMinutes: number;
  summary: string;
  body: string[];
}

export const Communication: React.FC<CommunicationProps> = ({ progress, onAddScore, onCompleteLesson }) => {
  const [activeTab, setActiveTab] = useState<'speaking' | 'listening' | 'bodylang' | 'articles'>('speaking');

  // PUBLIC SPEAKING STATE
  const [selectedTopic, setSelectedTopic] = useState("The Future of Remote Collaboration");
  const [speechDraft, setSpeechDraft] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [speechCompleted, setSpeechCompleted] = useState(false);

  const topics = [
    "The Future of Remote Collaboration",
    "Ethical Dimensions of Artificial Intelligence",
    "Handling Constructive Feedback in a Team",
    "The Art of Pitching a Creative Idea",
    "Why Emotional Intelligence Matters in Tech"
  ];

  useEffect(() => {
    let interval: any;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleStartTimer = () => {
    setTimerRunning(true);
  };

  const handleStopTimer = () => {
    setTimerRunning(false);
  };

  const handleResetSpeech = () => {
    setTimerRunning(false);
    setTimeElapsed(0);
    setSpeechCompleted(false);
  };

  const handleFinishSpeech = () => {
    setTimerRunning(false);
    if (timeElapsed >= 45 && speechDraft.trim().length > 50) {
      if (!progress.completedLessons.includes('comm-speaking')) {
        onAddScore(50);
        onCompleteLesson('comm-speaking');
      }
      setSpeechCompleted(true);
    } else {
      alert("Try drafting at least 50 characters of outline notes and practice speaking for at least 45 seconds to get XP!");
    }
  };

  // ACTIVE LISTENING STATE
  const [selectedListeningOption, setSelectedListeningOption] = useState<number | null>(null);
  const [listeningAnswered, setListeningAnswered] = useState(false);

  const listeningScenario = {
    audioTranscript: `[Client Manager speaks with urgency]: "We appreciate the updates on the dashboard frontend. However, our board presentation is on Tuesday morning, and the analytics module is still loading mockup numbers. We need the actual data integration completed by Monday night so we can double check the calculations. If this isn't resolved, it calls the entire timeline into question."`,
    question: "What is the primary underlying concern of the client manager?",
    options: [
      "They dislike the style choices and layouts on the frontend dashboard.",
      "They are highly anxious about presenting mock calculations to their board on Tuesday and need validated database numbers by Monday night.",
      "They want to cancel the contract and request a full refund.",
      "They are requesting additional training on using the new dashboard analytics."
    ],
    correctIndex: 1,
    explanation: "Excellent active listening! The client manager isn't complaining about layouts or contract termination; they are highlighting a calendar blocker (board meeting Tuesday) that creates anxiety about presenting placeholder figures, requesting database integration by Monday night."
  };

  const handleListeningAnswer = (index: number) => {
    if (listeningAnswered) return;
    setSelectedListeningOption(index);
    setListeningAnswered(true);
    if (index === listeningScenario.correctIndex) {
      if (!progress.completedLessons.includes('comm-listening')) {
        onAddScore(50);
        onCompleteLesson('comm-listening');
      }
    }
  };

  // BODY LANGUAGE STATE
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);

  const bodyLanguageCards = [
    {
      id: "bl-1",
      gesture: "Steeple Hands (Fingertips Touching)",
      meaning: "Confidence and Authority",
      context: "Often used by leaders and experts when discussing key strategies or responding to critical client items.",
      tip: "Use this gesture when making high-impact points to naturally portray mastery, but avoid keeping it rigid."
    },
    {
      id: "bl-2",
      gesture: "Micro-Nods and Tilted Head",
      meaning: "Active Engagement and Empathy",
      context: "Signals that you are actively processing the interviewer's words and encourage continuation.",
      tip: "Nod slowly in sets of 2 or 3 when the interviewer explains a point. Do not nod too rapidly as it can project impatience."
    },
    {
      id: "bl-3",
      gesture: "Open Palm Gestures",
      meaning: "Honesty and Transparency",
      context: "Portrays approachability, openness to ideas, and sincere alignment with the listener.",
      tip: "Keep your hands above table height. Gesture outward with open palms when describing your achievements or team work."
    },
    {
      id: "bl-4",
      gesture: "Frequent Throat-Clearing / Touching Neck",
      meaning: "Anxiety and Self-Soothing",
      context: "Signals nervous tension or self-doubt under pressure, often indicating discomfort with the current question.",
      tip: "If you feel anxious, keep your hands resting comfortably on your lap or desk. Take a slow breath before answering."
    }
  ];

  const handleCardClick = (id: string) => {
    setFlippedCardId(flippedCardId === id ? null : id);
    if (!progress.completedLessons.includes('comm-bodylang')) {
      onAddScore(25);
      onCompleteLesson('comm-bodylang');
    }
  };

  // ARTICLES LIBRARY STATE
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [readArticleIds, setReadArticleIds] = useState<string[]>([]);
  const articlesGridRef = useScrollReveal<HTMLDivElement>({ deps: [activeTab] });
  const flashcardGridRef = useScrollReveal<HTMLDivElement>({ deps: [activeTab] });

  const articles: Article[] = [
    {
      id: "art-1",
      title: "The Structure Behind Every Great Impromptu Answer",
      category: "Public Speaking",
      readTimeMinutes: 4,
      summary: "A simple three-part framework you can apply on the spot when an interviewer throws an unexpected question your way.",
      body: [
        "Most people freeze in impromptu situations not because they lack knowledge, but because they lack structure. Without a framework, even a well-informed answer can wander and lose the listener halfway through.",
        "The PREP method — Point, Reason, Example, Point — solves this. Start by stating your core point in one sentence. Follow with the reason behind it. Then anchor the reason with a concrete example or short story. Finally, restate your point to close the loop.",
        "For example, if asked 'What's your biggest strength?', you might say: 'My biggest strength is adaptability (Point). In fast-moving teams, priorities shift weekly, and rigid habits slow everyone down (Reason). Last semester, when our project scope changed two weeks before a deadline, I reorganized my approach within a day and still delivered on time (Example). That adaptability is what I bring to any team I join (Point).'",
        "Practicing PREP on everyday questions — even casual ones like 'How was your weekend?' — builds the muscle memory so it feels natural under real interview pressure.",
        "The biggest mistake candidates make is trying to say everything they know. A tight, structured 45-second answer almost always lands better than a rambling two-minute one."
      ]
    },
    {
      id: "art-2",
      title: "Why Interviewers Remember How You Made Them Feel",
      category: "Interpersonal",
      readTimeMinutes: 5,
      summary: "Technical correctness matters, but the emotional tone of a conversation is often what gets remembered afterward.",
      body: [
        "Interviewers sit through dozens of conversations in a hiring cycle. Days later, they rarely recall exact phrasing — but they do remember how a conversation felt: energetic, tense, warm, or flat.",
        "This is partly why candidates who ask genuine follow-up questions tend to leave a stronger impression than those who simply answer and wait for the next question. Curiosity signals engagement, and engagement is memorable.",
        "Small behaviors compound here: maintaining steady eye contact (or camera contact on video calls), matching the interviewer's energy level, and pausing briefly before answering difficult questions instead of rushing to fill silence.",
        "None of this means performing enthusiasm you don't feel. It means removing friction — nervous fidgeting, monotone delivery, defensive body language — so your genuine interest can actually come through.",
        "A useful habit: at the end of any mock interview practice session, ask yourself not just 'did I answer correctly' but 'how did that conversation probably feel to the other person'."
      ]
    },
    {
      id: "art-3",
      title: "Active Listening Is a Skill, Not a Personality Trait",
      category: "Listening",
      readTimeMinutes: 4,
      summary: "Good listeners aren't born that way — they use specific, learnable techniques during conversations.",
      body: [
        "It's tempting to think some people are naturally 'good listeners' while others aren't. In practice, active listening is a set of concrete techniques anyone can train.",
        "The first is paraphrasing: briefly restating what the other person said in your own words before responding. This does two things — it confirms you understood correctly, and it signals to the speaker that they were heard.",
        "The second is holding the pause. Most people start formulating their response while the other person is still talking. Practicing a one-second pause after someone finishes speaking, before you respond, dramatically improves the quality of what you say next.",
        "The third is asking clarifying questions instead of assuming. In client or stakeholder conversations especially, jumping to conclusions about what someone 'really means' causes more miscommunication than almost anything else.",
        "In technical interviews, active listening shows up as clarifying the problem constraints before diving into code — a habit that interviewers consistently rate highly."
      ]
    },
    {
      id: "art-4",
      title: "Reading the Room: Body Language Basics for Video Calls",
      category: "Non-Verbal Communication",
      readTimeMinutes: 3,
      summary: "Remote interviews strip away most body language cues — here's what still matters on camera.",
      body: [
        "On a video call, an interviewer only sees your face, shoulders, and whatever's visible behind you. That narrow window means the few signals that remain carry more weight than they would in person.",
        "Camera-level eye contact is the single biggest lever. Looking at the camera lens (not the screen) roughly 60-70% of the time approximates natural eye contact, even though it feels unnatural at first.",
        "Framing matters too: sitting slightly back from the camera with your head and upper shoulders visible reads as more composed than being tightly zoomed in.",
        "Micro-nods — small, deliberate nods while the interviewer talks — translate surprisingly well on camera and substitute for the in-person cues that get lost in a small video window.",
        "Lighting and background aren't just aesthetic choices; a well-lit face is easier to read expressions from, which unconsciously makes you seem more open and trustworthy."
      ]
    },
    {
      id: "art-5",
      title: "The Diplomatic Email: Saying No Without Burning Bridges",
      category: "Written Communication",
      readTimeMinutes: 4,
      summary: "A short template for declining requests or pushing back over email while preserving the relationship.",
      body: [
        "Written communication removes tone of voice, which means the same words can land as either firm-but-respectful or cold-and-dismissive depending on structure alone.",
        "A reliable pattern for declining or pushing back: acknowledge first, state the constraint clearly, then offer an alternative. For example: 'Thanks for flagging this — I can see why it feels urgent. Given the current sprint commitments, I won't be able to take this on before Friday, but I could prioritize it first thing next week, or loop in someone from the platform team if it truly can't wait.'",
        "Notice what's absent: no over-apologizing, no vague hedging ('I'll try my best to maybe look into it'), and no leaving the other person without a next step.",
        "Avoid absolute language in the body of a difficult email ('this is impossible', 'that never works') — it tends to escalate rather than resolve, especially with people you'll continue working with.",
        "One useful test before sending any pointed email: read it back imagining the recipient reading it out loud to a colleague. If it would sound harsh read aloud, it's worth softening."
      ]
    },
    {
      id: "art-6",
      title: "Vocal Variety: Why Monotone Kills Even Great Content",
      category: "Public Speaking",
      readTimeMinutes: 3,
      summary: "How pacing, pausing, and pitch changes keep listeners engaged — and how to practice them deliberately.",
      body: [
        "Content quality has a ceiling on how engaging it can be if it's delivered in a flat, unvarying tone. Listeners disengage from monotone speech within seconds, regardless of how good the ideas are.",
        "Three levers control vocal variety: pace (speeding up for excitement, slowing down for emphasis), pitch (rising slightly on key words), and pause (a deliberate silence before an important point commands more attention than raising your volume).",
        "A simple drill: record yourself reading the same paragraph twice — once flat, once deliberately varying pace and pausing before the last word of key sentences. Most people are shocked at how different the two versions sound, and how much more natural the varied version feels to a listener despite feeling exaggerated to the speaker.",
        "In interviews specifically, a brief pause before answering a hard question (instead of an immediate 'um... so...') reads as thoughtful confidence rather than hesitation.",
        "Vocal variety can't be faked long-term through pure repetition of memorized inflections — it has to come from genuinely varying emphasis based on what you find most important in what you're saying, which is another reason drafting a rough mental outline before speaking helps."
      ]
    },
    {
      id: "art-7",
      title: "The Cultural Layer of Workplace Communication",
      category: "Interpersonal",
      readTimeMinutes: 5,
      summary: "Communication norms differ across teams and regions — recognizing this prevents unnecessary friction.",
      body: [
        "What counts as 'direct' or 'polite' communication varies significantly across regions, industries, and even individual teams. A message that reads as efficient in one context can read as curt in another.",
        "In global or distributed teams, this shows up constantly: a one-line Slack reply might be completely normal from one colleague and feel dismissive coming from another, purely due to different communication norms rather than different levels of respect.",
        "The practical takeaway isn't to memorize cultural rules, but to build a habit of checking assumptions: if a message from a colleague feels unexpectedly blunt or unexpectedly vague, consider that it may reflect their communication norms rather than their intent toward you.",
        "This matters directly in interviews too — international students and candidates from different educational systems sometimes under-elaborate on achievements out of humility norms that don't always translate well to interview contexts that reward explicit self-advocacy.",
        "Being aware of this gap is itself a communication skill: it lets you adjust your own delivery deliberately for the audience in front of you, rather than defaulting to a single style everywhere."
      ]
    },
    {
      id: "art-8",
      title: "Turning Feedback Into Fuel Instead of a Verdict",
      category: "Interpersonal",
      readTimeMinutes: 4,
      summary: "A practical way to receive critical feedback in interviews and at work without becoming defensive.",
      body: [
        "The instinctive reaction to critical feedback is often defensive — explaining context, minimizing the issue, or mentally rehearsing a rebuttal while the other person is still talking.",
        "A more useful first response is a single clarifying question: 'Can you give me a specific example of where that showed up?' This does two things — it slows down your own defensive reflex, and it turns vague feedback into something actionable.",
        "Separating the feedback from your identity helps too. 'My explanation in that section was unclear' is a fixable, specific problem. 'I'm bad at explaining things' is an identity claim that feels much harder to act on and much more threatening to hear.",
        "In an interview setting, if an interviewer pushes back on part of your answer, resisting the urge to double down and instead saying 'that's fair, let me reconsider that part' signals maturity that interviewers consistently value over surface-level correctness.",
        "The goal isn't to agree with all feedback uncritically — it's to fully understand it before deciding how much weight to give it."
      ]
    }
  ];

  const handleOpenArticle = (id: string) => {
    setSelectedArticleId(id);
    if (!readArticleIds.includes(id)) {
      const updated = [...readArticleIds, id];
      setReadArticleIds(updated);
      onAddScore(10);
      if (updated.length >= articles.length && !progress.completedLessons.includes('comm-articles')) {
        onCompleteLesson('comm-articles');
        onAddScore(30);
      }
    }
  };

  const selectedArticle = articles.find(a => a.id === selectedArticleId) ?? null;

  const navItems: SideNavItem[] = [
    { id: 'speaking', label: 'Public Speaking', icon: <SpeechIcon size={18} /> },
    { id: 'listening', label: 'Active Listening', icon: <HeartIcon size={18} /> },
    { id: 'bodylang', label: 'Body Language', icon: <EyeIcon size={18} />, count: bodyLanguageCards.length },
    { id: 'articles', label: 'Reading Room', icon: <BookOpenIcon size={18} />, count: `${readArticleIds.length}/${articles.length}` },
  ];

  const heroByTab: Record<string, { title: string; subtitle: string; color: string; tint: string }> = {
    speaking: { title: 'Public Speaking Studio', subtitle: 'Practice structuring quick, confident impromptu pitches against the clock.', color: 'var(--accent-cyan)', tint: 'rgba(37,99,235,0.12)' },
    listening: { title: 'Active Listening Simulation', subtitle: 'Read a client conversation closely, then choose the most perceptive response.', color: 'var(--accent-violet)', tint: 'rgba(124,58,237,0.12)' },
    bodylang: { title: 'Body Language Flashcards', subtitle: 'Flip cards to learn how non-verbal cues read in an interview room.', color: 'var(--accent)', tint: 'var(--accent-soft)' },
    articles: { title: 'Reading Room', subtitle: 'A short library of communication-skills articles, +10 XP each.', color: 'var(--accent-emerald)', tint: 'rgba(5,150,105,0.12)' },
  };

  const currentHero = heroByTab[activeTab];

  return (
    <div className="animate-slide-up">
      <SectionHero
        icon={<SpeechIcon size={26} />}
        title={currentHero.title}
        subtitle={currentHero.subtitle}
        color={currentHero.color}
        tint={currentHero.tint}
        right={
          <div className="hero-right-group">
            <span className="hero-skill-ill" style={{ color: currentHero.color }}>
              <SkillIllustration kind="communication" size={76} />
            </span>
            <ProgressRing
              percentage={Math.round((readArticleIds.length / Math.max(1, articles.length)) * 100)}
              size={72}
              stroke={6}
              color={currentHero.color}
              sublabel="read"
            />
          </div>
        }
      />

      <div className="section-shell">
        <SideNav items={navItems} active={activeTab} onSelect={(id) => setActiveTab(id as typeof activeTab)} />

        <div className="panel-swap" key={activeTab}>

      {/* PUBLIC SPEAKING TAB */}
      {activeTab === 'speaking' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="grid-dashboard">
          
          {/* Main workspace */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>Impromptu Pitch Challenge</span>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Topic: <span className="gradient-text-cyan-violet">{selectedTopic}</span></h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Practice structuring a quick 1-2 minute presentation. Focus on a clear hook, an organized body point, and a call-to-action conclusion.
              </p>
            </div>

            {/* Select Topic dropdown */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {topics.map(t => (
                <button
                  key={t}
                  onClick={() => { setSelectedTopic(t); handleResetSpeech(); }}
                  className={`btn btn-secondary ${selectedTopic === t ? 'btn-primary' : ''}`}
                  style={{ padding: '8px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
                >
                  {t === selectedTopic && <CheckIcon size={12} style={{ marginRight: '4px' }} />}
                  {t.length > 25 ? t.slice(0, 25) + "..." : t}
                </button>
              ))}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Draft Outline Notes (Bullet points, key terms):</label>
              <textarea
                value={speechDraft}
                onChange={(e) => setSpeechDraft(e.target.value)}
                placeholder="Hook: How did the pandemic reset collaboration?&#10;Body: Detail tools (video, async docs) vs. psychological boundaries.&#10;Conclusion: Intentional, hybrid schedules."
                className="form-input form-textarea"
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {!timerRunning ? (
                <button className="btn btn-primary" onClick={handleStartTimer}>
                  <PlayIcon size={18} />
                  Start Speech Timer
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={handleStopTimer} style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
                  Pause Timer
                </button>
              )}
              
              <button className="btn btn-secondary" onClick={handleResetSpeech}>
                <RefreshIcon size={18} />
                Reset
              </button>

              <button className="btn btn-accent" onClick={handleFinishSpeech}>
                Complete Speaking Practice
              </button>
            </div>
          </div>

          {/* Guidelines and Timer status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Timer Screen */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '200px', background: timerRunning ? 'var(--accent-soft)' : 'var(--card-bg)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Active Presentation Timer</div>
              <h2 style={{ fontSize: '3.5rem', fontWeight: 800, fontFamily: 'monospace' }} className="gradient-text-cyan-violet">
                {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
              </h2>
              <span className="badge" style={{ borderColor: timeElapsed >= 45 ? 'var(--accent-emerald)' : 'var(--card-border)', color: timeElapsed >= 45 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                {timeElapsed >= 45 ? 'Goal Reached (45s+)' : 'Practice speaking for 45s+'}
              </span>
            </div>

            {/* Speech Structuring checklist */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '1.1rem' }}>Structuring Your Impromptu Speech</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', listStyleType: 'none', paddingLeft: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', gap: '8px' }}>
                  <CheckIcon size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
                  <div><strong>The Hook (0-15s):</strong> Grab attention with a surprising statistic, a quote, or a short anecdote.</div>
                </li>
                <li style={{ display: 'flex', gap: '8px' }}>
                  <CheckIcon size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
                  <div><strong>The Core Point (15-60s):</strong> Deliver 1 or 2 supporting arguments with real-world context.</div>
                </li>
                <li style={{ display: 'flex', gap: '8px' }}>
                  <CheckIcon size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
                  <div><strong>The Call-To-Action (60-90s):</strong> Summarize and close with a forward-looking prompt.</div>
                </li>
              </ul>
            </div>

            {speechCompleted && (
              <div className="glass-panel animate-fade-in" style={{ padding: '20px', border: '1px solid var(--accent-emerald)', background: 'rgba(5, 150, 105, 0.06)' }}>
                <h4 style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  Practice Complete! (+50 XP)
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Excellent pitch. You've drafted a outline and practiced vocal speech structures for the recommended time.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACTIVE LISTENING TAB */}
      {activeTab === 'listening' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <span className="badge badge-violet" style={{ marginBottom: '12px' }}>Client Conversation Simulator</span>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Listening Passage</h3>
            
            <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)', fontStyle: 'italic', marginBottom: '24px', lineHeight: '1.7', color: 'var(--text-primary)' }}>
              {listeningScenario.audioTranscript}
            </div>

            <h4 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>{listeningScenario.question}</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {listeningScenario.options.map((option, idx) => {
                let styleClass = "quiz-option";
                if (listeningAnswered) {
                  if (idx === listeningScenario.correctIndex) {
                    styleClass += " quiz-option-correct";
                  } else if (idx === selectedListeningOption) {
                    styleClass += " quiz-option-incorrect";
                  }
                } else {
                  if (idx === selectedListeningOption) {
                    styleClass += " quiz-option-selected";
                  }
                }

                return (
                  <button
                    key={idx}
                    className={styleClass}
                    onClick={() => handleListeningAnswer(idx)}
                    disabled={listeningAnswered}
                    style={{ margin: 0 }}
                  >
                    <div className="option-indicator">
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {listeningAnswered && (
              <div className="animate-fade-in" style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--card-border)', marginTop: '24px' }}>
                <h5 style={{ color: selectedListeningOption === listeningScenario.correctIndex ? 'var(--accent-emerald)' : 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  {selectedListeningOption === listeningScenario.correctIndex ? 'Correct Analysis! (+50 XP)' : 'Incorrect analysis'}
                </h5>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{listeningScenario.explanation}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BODY LANGUAGE TAB */}
      {activeTab === 'bodylang' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <span className="badge badge-cyan" style={{ marginBottom: '8px' }}>Non-Verbal Cues</span>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>Body Language Flashcards</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Click on a card to flip it and read its professional interpretation and interview tips.</p>
          </div>

          <div className="flashcard-grid" ref={flashcardGridRef}>
            {bodyLanguageCards.map((card) => {
              const isFlipped = flippedCardId === card.id;
              return (
                <div
                  key={card.id}
                  className={`flashcard-container reveal-item ${isFlipped ? 'flashcard-flipped' : ''}`}
                  onClick={() => handleCardClick(card.id)}
                >
                  <div className="flashcard-inner">
                    {/* Front */}
                    <div className="flashcard-front">
                      <span className="badge" style={{ alignSelf: 'flex-start', marginBottom: '12px', fontSize: '0.65rem' }}>Gesture</span>
                      <h4 style={{ fontSize: '1.2rem', textAlign: 'center', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {card.gesture}
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>Click to flip</p>
                    </div>

                    {/* Back */}
                    <div className="flashcard-back">
                      <h5 style={{ fontSize: '1rem', color: 'var(--accent-cyan)', marginBottom: '4px' }}>Meaning: {card.meaning}</h5>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: '1.4' }}>
                        <strong>Context:</strong> {card.context}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px solid var(--card-border)', paddingTop: '6px' }}>
                        <strong>Tip:</strong> {card.tip}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ARTICLES / READING ROOM TAB */}
      {activeTab === 'articles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge badge-violet" style={{ marginBottom: '8px' }}>Reading Room</span>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>Communication Skills Article Library</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {readArticleIds.length} of {articles.length} articles read. Each article read gives +10 XP; finish the whole library for a +30 XP bonus.
              </p>
            </div>
          </div>

          <div ref={articlesGridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {articles.map((article) => {
              const isRead = readArticleIds.includes(article.id);
              return (
                <div
                  key={article.id}
                  className="glass-card-interactive reveal-item"
                  style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                  onClick={() => handleOpenArticle(article.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-cyan">{article.category}</span>
                    {isRead && <CheckIcon size={16} style={{ color: 'var(--accent-emerald)' }} />}
                  </div>
                  <h4 style={{ fontSize: '1.1rem', lineHeight: '1.3' }}>{article.title}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flexGrow: 1 }}>{article.summary}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <ClockIcon size={12} />
                    <span>{article.readTimeMinutes} min read</span>
                    <BookOpenIcon size={12} style={{ marginLeft: 'auto' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ARTICLE READER MODAL */}
      {selectedArticle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setSelectedArticleId(null)}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{ maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '32px', background: 'var(--card-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
              <div>
                <span className="badge badge-violet" style={{ marginBottom: '10px' }}>{selectedArticle.category}</span>
                <h2 style={{ fontSize: '1.5rem', lineHeight: '1.3' }}>{selectedArticle.title}</h2>
              </div>
              <button
                onClick={() => setSelectedArticleId(null)}
                className="btn btn-secondary"
                style={{ padding: '8px', flexShrink: 0 }}
              >
                <XIcon size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              <ClockIcon size={14} />
              <span>{selectedArticle.readTimeMinutes} min read</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedArticle.body.map((paragraph, idx) => (
                <p key={idx} style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
};
